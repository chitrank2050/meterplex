/**
 * ReconciliationService - Compares raw usage events against aggregated totals.
 *
 * Why this exists:
 *   Usage events flow through a multi-stage pipeline:
 *   ingestion → outbox → Kafka → validation → aggregation.
 *   At any point, events can be lost, double-counted, or stuck.
 *   This service detects those discrepancies before they corrupt billing.
 *
 * How it works:
 *   For each tenant with an active subscription:
 *     expected = SUM(usage_events.amount) WHERE status = AGGREGATED
 *     actual   = usage_aggregates.amount
 *   Mismatches are recorded as reconciliation issues for admin review.
 *
 * Two run modes:
 *   - Scheduled: daily at 00:30 UTC (after billing cron at 00:05)
 *   - Manual: triggered via POST /admin/reconciliation/run
 *
 * Detects two types of discrepancies:
 *   1. Under-billed: events aggregated in usage_events but not reflected
 *      in usage_aggregates (lost during aggregation). difference > 0.
 *   2. Over-billed: usage_aggregates has a higher amount than the sum
 *      of events (duplicate aggregation). difference < 0.
 *   3. Phantom aggregates: usage_aggregates row exists but no matching
 *      events (e.g., from a direct DB edit or seed data mismatch).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '@app-prisma/prisma.service';

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
   * @returns Paginated reconciliation issues with metadata
   */
  async findIssuesByRun(runId: string, page = 1, limit = 50) {
    const pageNum = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * pageSize;

    const [issues, total] = await Promise.all([
      this.prisma.reconciliationIssue.findMany({
        where: { runId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.reconciliationIssue.count({ where: { runId } }),
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
}
