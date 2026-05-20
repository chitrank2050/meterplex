/**
 * BillingCronService - Automated billing period close and invoice generation.
 *
 * Runs daily at 00:05 UTC via @nestjs/schedule.
 * Each tick:
 *   1. Find all subscriptions with expired billing periods
 *   2. Find all cancelled subscriptions needing prorated invoices
 *   3. For each: generate DRAFT → auto-finalize → advance period
 *   4. Log results: X invoices generated, Y failures
 *
 * Each subscription is processed independently - one failure
 * does not block others. Failed subscriptions are retried on
 * the next cron tick (they still have expired periods).
 *
 * Why 00:05 UTC and not 00:00?
 *   Exact midnight has edge cases: usage events timestamped at
 *   23:59:59 might still be in the pipeline. 5 minutes of buffer
 *   ensures all events from the previous day are aggregated.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { BillingPeriodService } from './billing-period.service';
import { InvoiceGenerationService } from './invoice-generation.service';
import { InvoiceLifecycleService } from './invoice-lifecycle.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);
  private isProcessing = false;

  constructor(
    private readonly billingPeriod: BillingPeriodService,
    private readonly invoiceGeneration: InvoiceGenerationService,
    private readonly invoiceLifecycle: InvoiceLifecycleService,
  ) {}

  /**
   * Runs daily at 00:05 UTC.
   *
   * The isProcessing guard prevents overlapping runs if the
   * previous tick is still processing (e.g., many subscriptions).
   */
  @Cron('0 5 0 * * *', { timeZone: 'UTC' })
  async handleBillingCycle(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Billing cycle already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Billing cycle started');

    let generated = 0;
    let failed = 0;

    try {
      // 1. Process expired billing periods (full invoices)
      const billable = await this.billingPeriod.findBillableSubscriptions();
      this.logger.log(
        `Found ${billable.length} subscriptions with expired periods`,
      );

      for (const subscription of billable) {
        try {
          // Generate DRAFT invoice
          const invoice = await this.invoiceGeneration.generate(subscription);

          if (!invoice) {
            this.logger.warn(
              `Failed to generate invoice for subscription ${subscription.id}`,
            );
            failed++;
            continue;
          }

          // Auto-finalize (assigns number, creates ledger CHARGE)
          await this.invoiceLifecycle.finalize(
            invoice.id,
            subscription.tenantId,
          );

          // Advance to next billing period
          await this.billingPeriod.advancePeriod(
            subscription.id,
            subscription.currentPeriodEnd,
            subscription.price.interval,
          );

          generated++;
          this.logger.log(
            `Billed ${subscription.plan.slug} for tenant ${subscription.tenantId}`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to bill subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue to next subscription - don't block others
        }
      }

      // 2. Process cancelled subscriptions (prorated invoices)
      const cancelled =
        await this.billingPeriod.findCancelledSubscriptionsNeedingInvoice();
      this.logger.log(
        `Found ${cancelled.length} cancelled subscriptions needing prorated invoices`,
      );

      for (const subscription of cancelled) {
        try {
          // Generate prorated DRAFT invoice
          const invoice = await this.invoiceGeneration.generateProrated(
            subscription,
            subscription.cancelledAt,
          );

          if (!invoice) {
            this.logger.warn(
              `Failed to generate prorated invoice for subscription ${subscription.id}`,
            );
            failed++;
            continue;
          }

          // Auto-finalize
          await this.invoiceLifecycle.finalize(
            invoice.id,
            subscription.tenantId,
          );

          generated++;
          this.logger.log(
            `Prorated invoice for cancelled ${subscription.plan.slug} (tenant ${subscription.tenantId})`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to generate prorated invoice for ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Billing cycle failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
      this.logger.log(
        `Billing cycle complete: ${generated} invoices generated, ${failed} failures`,
      );
    }
  }
}
