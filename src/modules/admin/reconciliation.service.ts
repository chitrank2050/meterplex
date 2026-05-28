/**
 * ReconciliationService - Billing integrity checks.
 *
 * Why this exists:
 *   Usage events flow through a multi-stage pipeline:
 *   ingestion → outbox → Kafka → validation → aggregation.
 *   At any point, events can be lost, double-counted, or stuck.
 *   Subscriptions, invoices, and payments can also drift out of sync.
 *   This service detects those discrepancies before they corrupt billing.
 *
 * Two categories of checks:
 *
 *   Usage reconciliation (category: 'usage'):
 *     For each tenant with an active subscription:
 *       expected = SUM(usage_events.amount) WHERE status = AGGREGATED
 *       actual   = usage_aggregates.amount
 *     Detects:
 *       1. Under-billed: lost events during aggregation (difference > 0)
 *       2. Over-billed: duplicate aggregation (difference < 0)
 *       3. Phantom aggregates: aggregates with no source events
 *
 *   Subscription/payment reconciliation (category: 'subscription_payment'):
 *     Cross-checks subscription state against payment and invoice state.
 *     Detects:
 *       1. ACTIVE subscriptions with overdue unpaid invoices
 *       2. PAST_DUE subscriptions with unprocessed successful payments
 *       3. CANCELLED subscriptions missing prorated invoices
 *       4. Ledger CHARGE totals that don't match invoice totals
 *
 * Two run modes:
 *   - Scheduled: daily at 00:30 UTC (after billing cron at 00:05)
 *   - Manual: triggered via POST /admin/reconciliation/run
 *
 * All issues are written to reconciliation_issues with a category
 * field for filtering in the admin UI.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants';

import {
  ReconciliationIssueStatus,
  ReconciliationRunStatus,
  SubscriptionStatus,
} from '@prisma/client';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scheduled reconciliation - daily at 00:30 UTC.
   *
   * Runs 25 minutes after the billing cron (00:05 UTC) to ensure
   * all period-end invoices are generated before we reconcile.
   */
  @Cron('0 30 0 * * *', { timeZone: 'UTC' })
  async scheduledRun(): Promise<void> {
    this.logger.log('Starting scheduled reconciliation run');
    await this.runReconciliation('cron');
  }

  /**
   * Manual reconciliation - triggered by admin API.
   *
   * Same logic as scheduled, but triggered on-demand.
   * Useful after fixing a dead letter event, running a data
   * migration, or investigating a billing discrepancy.
   *
   * @param adminId - UUID of the admin triggering the run
   * @returns The completed reconciliation run with summary
   */
  async triggerManual(adminId: string) {
    this.logger.log(`Manual reconciliation triggered by admin ${adminId}`);
    return this.runReconciliation(adminId);
  }

  /**
   * Core reconciliation logic.
   *
   * Flow:
   *   1. Create a RUNNING reconciliation_run record
   *   2. Find all tenants with active subscriptions
   *   3. For each tenant: compare SUM(usage_events) vs usage_aggregates
   *   4. Record mismatches as reconciliation_issues
   *   5. Check for phantom aggregates (aggregates with no source events)
   *   6. Update run as COMPLETED with summary counts
   *
   * Error handling:
   *   If the run crashes, the record is updated to FAILED with the
   *   error message. The next scheduled run will start fresh.
   *
   * @param triggeredBy - 'cron' or admin UUID
   * @returns The completed (or failed) reconciliation run
   */
  async runReconciliation(triggeredBy: string) {
    const startTime = Date.now();

    const run = await this.prisma.reconciliationRun.create({
      data: {
        triggeredBy,
        status: ReconciliationRunStatus.RUNNING,
      },
    });

    try {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      // Find all tenants with active subscriptions (deduplicated)
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        select: { tenantId: true },
        distinct: ['tenantId'],
      });

      let tenantsChecked = 0;
      let issuesFound = 0;

      for (const sub of subscriptions) {
        // Expected: SUM of raw usage events grouped by feature.
        // Excludes seed data (metadata.source = 'seed') to avoid
        // false positives from development seed scripts.
        const expected: Array<{
          feature_lookup_key: string;
          total: bigint;
        }> = await this.prisma.$queryRaw`
          SELECT feature_lookup_key, SUM(amount)::bigint AS total
          FROM usage_events
          WHERE tenant_id = ${sub.tenantId}::uuid
            AND status = 'AGGREGATED'
            AND metadata->>'source' != 'seed'
          GROUP BY feature_lookup_key
        `;

        // Actual: usage_aggregates for this tenant + current period
        const aggregates = await this.prisma.usageAggregate.findMany({
          where: {
            tenantId: sub.tenantId,
            periodKey,
          },
          select: {
            featureLookupKey: true,
            amount: true,
          },
        });

        const actualMap = new Map(
          aggregates.map((a) => [a.featureLookupKey, a.amount]),
        );

        // Compare each feature's expected vs actual
        for (const row of expected) {
          const expectedAmount = Number(row.total);
          const actualAmount = actualMap.get(row.feature_lookup_key) ?? 0;

          if (expectedAmount !== actualAmount) {
            await this.prisma.reconciliationIssue.create({
              data: {
                runId: run.id,
                tenantId: sub.tenantId,
                featureLookupKey: row.feature_lookup_key,
                periodKey,
                expected: expectedAmount,
                actual: actualAmount,
                difference: expectedAmount - actualAmount,
                status: ReconciliationIssueStatus.OPEN,
              },
            });
            issuesFound++;
          }

          tenantsChecked++;
        }

        // Detect phantom aggregates: rows in usage_aggregates with
        // no matching events. Could indicate duplicate aggregation
        // or direct DB manipulation.
        for (const agg of aggregates) {
          const hasEvents = expected.some(
            (e) => e.feature_lookup_key === agg.featureLookupKey,
          );
          if (!hasEvents && agg.amount > 0) {
            await this.prisma.reconciliationIssue.create({
              data: {
                runId: run.id,
                tenantId: sub.tenantId,
                featureLookupKey: agg.featureLookupKey,
                periodKey,
                expected: 0,
                actual: agg.amount,
                difference: -agg.amount,
                status: ReconciliationIssueStatus.OPEN,
              },
            });
            issuesFound++;
          }
        }
      }

      // --- Subscription/Payment consistency checks ---
      const paymentIssues = await this.checkSubscriptionPaymentConsistency(
        run.id,
      );

      issuesFound += paymentIssues;

      const durationMs = Date.now() - startTime;

      const completed = await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationRunStatus.COMPLETED,
          durationMs,
          tenantsChecked,
          issuesFound,
        },
      });

      this.logger.log(
        `Reconciliation complete: ${tenantsChecked} checked, ${issuesFound} issues found (${durationMs}ms)`,
      );

      return completed;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationRunStatus.FAILED,
          durationMs,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      this.logger.error(
        `Reconciliation failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw error;
    }
  }

  /**
   * Check subscription state vs payment state consistency.
   *
   * Four checks:
   *   1. ACTIVE subscriptions with overdue unpaid invoices
   *   2. PAST_DUE subscriptions with recent successful payments
   *   3. CANCELLED subscriptions missing prorated invoices
   *   4. Ledger charge/invoice total mismatches
   *
   * Called as part of the main reconciliation run.
   * Issues written with category = 'subscription_payment'.
   *
   * @param runId - The reconciliation run to attach issues to
   * @returns Number of issues found
   */
  private async checkSubscriptionPaymentConsistency(
    runId: string,
  ): Promise<number> {
    let issuesFound = 0;
    const now = new Date();

    // 1. ACTIVE subscriptions with overdue unpaid FINALIZED invoices.
    //    An invoice past its due date that hasn't been paid means
    //    the subscription should probably be PAST_DUE.
    const overdueInvoices: Array<{
      id: string;
      tenant_id: string;
      subscription_id: string;
      invoice_number: string;
      total: number;
      due_date: Date;
    }> = await this.prisma.$queryRaw`
      SELECT i.id, i.tenant_id, i.subscription_id, i.invoice_number, i.total, i.due_date
      FROM invoices i
      JOIN subscriptions s ON s.id = i.subscription_id
      WHERE i.status = 'FINALIZED'
        AND i.due_date < ${now}
        AND s.status IN ('ACTIVE', 'TRIALING')
    `;

    for (const inv of overdueInvoices) {
      await this.prisma.reconciliationIssue.create({
        data: {
          runId,
          tenantId: inv.tenant_id,
          featureLookupKey: `invoice:${inv.invoice_number}`,
          periodKey: 'n/a',
          expected: inv.total,
          actual: 0,
          difference: inv.total,
          category: 'subscription_payment',
          status: ReconciliationIssueStatus.OPEN,
          notes: `ACTIVE subscription has unpaid invoice ${inv.invoice_number} past due date`,
        },
      });
      issuesFound++;
    }

    // 2. PAST_DUE subscriptions with successful payments.
    //    If a payment succeeded but the subscription wasn't reactivated,
    //    something went wrong in the webhook handler.
    const pastDueWithPayments: Array<{
      subscription_id: string;
      tenant_id: string;
      provider_payment_id: string;
    }> = await this.prisma.$queryRaw`
      SELECT DISTINCT s.id AS subscription_id, s.tenant_id, pa.provider_payment_id
      FROM subscriptions s
      JOIN invoices i ON i.subscription_id = s.id
      JOIN payment_attempts pa ON pa.invoice_id = i.id
      WHERE s.status = 'PAST_DUE'
        AND pa.status = 'SUCCEEDED'
        AND pa.created_at > s.updated_at
    `;

    for (const row of pastDueWithPayments) {
      await this.prisma.reconciliationIssue.create({
        data: {
          runId,
          tenantId: row.tenant_id,
          featureLookupKey: `subscription:${row.subscription_id}`,
          periodKey: 'n/a',
          expected: 0,
          actual: 0,
          difference: 0,
          category: 'subscription_payment',
          status: ReconciliationIssueStatus.OPEN,
          notes: `PAST_DUE subscription has successful payment ${row.provider_payment_id} - should be reactivated`,
        },
      });
      issuesFound++;
    }

    // 3. CANCELLED subscriptions with no final prorated invoice.
    //    When a subscription is cancelled mid-cycle, a prorated invoice
    //    should have been generated by the billing cron.
    const cancelledNoInvoice: Array<{
      id: string;
      tenant_id: string;
      cancelled_at: Date;
    }> = await this.prisma.$queryRaw`
      SELECT s.id, s.tenant_id, s.cancelled_at
      FROM subscriptions s
      WHERE s.status = 'CANCELLED'
        AND s.cancelled_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.subscription_id = s.id
            AND i.period_end <= s.cancelled_at
            AND i.status IN ('FINALIZED', 'PAID')
        )
    `;

    for (const row of cancelledNoInvoice) {
      await this.prisma.reconciliationIssue.create({
        data: {
          runId,
          tenantId: row.tenant_id,
          featureLookupKey: `subscription:${row.id}`,
          periodKey: 'n/a',
          expected: 1,
          actual: 0,
          difference: 1,
          category: 'subscription_payment',
          status: ReconciliationIssueStatus.OPEN,
          notes: `Cancelled subscription has no prorated invoice after cancellation at ${row.cancelled_at.toISOString()}`,
        },
      });
      issuesFound++;
    }

    // 4. Ledger CHARGE total vs invoice total mismatch.
    //    The CHARGE ledger entry created at finalization should
    //    equal the invoice total. If not, something corrupted the ledger.
    const ledgerMismatches: Array<{
      invoice_id: string;
      tenant_id: string;
      invoice_number: string;
      invoice_total: number;
      ledger_debit: number;
    }> = await this.prisma.$queryRaw`
      SELECT
        i.id AS invoice_id,
        i.tenant_id,
        i.invoice_number,
        i.total AS invoice_total,
        COALESCE(SUM(ble.debit), 0)::int AS ledger_debit
      FROM invoices i
      LEFT JOIN billing_ledger_entries ble
        ON ble.invoice_id = i.id AND ble.type = 'CHARGE'
      WHERE i.status IN ('FINALIZED', 'PAID')
        AND i.invoice_number IS NOT NULL
      GROUP BY i.id, i.tenant_id, i.invoice_number, i.total
      HAVING i.total != COALESCE(SUM(ble.debit), 0)
    `;

    for (const row of ledgerMismatches) {
      await this.prisma.reconciliationIssue.create({
        data: {
          runId,
          tenantId: row.tenant_id,
          featureLookupKey: `invoice:${row.invoice_number}`,
          periodKey: 'n/a',
          expected: row.invoice_total,
          actual: row.ledger_debit,
          difference: row.invoice_total - row.ledger_debit,
          category: 'subscription_payment',
          status: ReconciliationIssueStatus.OPEN,
          notes: `Invoice ${row.invoice_number} total (${row.invoice_total}) != ledger CHARGE debit (${row.ledger_debit})`,
        },
      });
      issuesFound++;
    }

    return issuesFound;
  }

  /**
   * List reconciliation runs with pagination.
   *
   * Ordered by ranAt descending - most recent run first.
   * The admin dashboard shows: "last run: 2h ago, 0 issues".
   *
   * @param page - Page number (1-based)
   * @param limit - Results per page (max 100)
   * @returns Paginated reconciliation runs with metadata
   */
  async findAllRuns(page = 1, limit = 20) {
    const pageNum = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * pageSize;

    const [runs, total] = await Promise.all([
      this.prisma.reconciliationRun.findMany({
        orderBy: { ranAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.reconciliationRun.count(),
    ]);

    return {
      data: runs,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get issues for a specific reconciliation run.
   *
   * Shows every mismatch found: tenant, feature, period,
   * expected vs actual, and the calculated difference.
   *
   * @param runId - Reconciliation run UUID
   * @param page - Page number (1-based)
   * @param limit - Results per page (max 100)
   * @param category - Optional filter: 'usage' or 'subscription_payment'
   * @returns Paginated reconciliation issues with metadata
   */
  async findIssuesByRun(
    runId: string,
    page = 1,
    limit = 50,
    category?: string,
  ) {
    const pageNum = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * pageSize;

    const where = {
      runId,
      ...(category && { category }),
    };

    const [issues, total] = await Promise.all([
      this.prisma.reconciliationIssue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.reconciliationIssue.count({ where }),
    ]);

    return {
      data: issues,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single reconciliation issue by ID.
   *
   * @param id - Reconciliation issue UUID
   * @returns The issue with full details
   * @throws NotFoundException if issue doesn't exist
   */
  async findIssueById(id: string) {
    const issue = await this.prisma.reconciliationIssue.findUnique({
      where: { id },
    });

    if (!issue) {
      throw new NotFoundException(ERRORS.RECONCILIATION.ISSUE_NOT_FOUND);
    }

    return issue;
  }

  /**
   * Acknowledge a reconciliation issue - admin has seen it,
   * investigation in progress.
   *
   * @param id - Reconciliation issue UUID
   * @param notes - Optional admin notes
   * @returns The updated issue
   * @throws NotFoundException if issue doesn't exist
   */
  async acknowledgeIssue(id: string, notes?: string) {
    await this.findIssueById(id);

    return this.prisma.reconciliationIssue.update({
      where: { id },
      data: {
        status: ReconciliationIssueStatus.ACKNOWLEDGED,
        ...(notes && { notes }),
      },
    });
  }

  /**
   * Resolve a reconciliation issue - mismatch explained or corrected.
   *
   * @param id - Reconciliation issue UUID
   * @param notes - Resolution explanation
   * @returns The updated issue
   * @throws NotFoundException if issue doesn't exist
   */
  async resolveIssue(id: string, notes?: string) {
    await this.findIssueById(id);

    return this.prisma.reconciliationIssue.update({
      where: { id },
      data: {
        status: ReconciliationIssueStatus.RESOLVED,
        ...(notes && { notes }),
      },
    });
  }
}
