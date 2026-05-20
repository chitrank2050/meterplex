/**
 * InvoicesModule - Billing, invoicing, and ledger management.
 *
 * Contains:
 *   - InvoiceGenerationService: creates invoices from usage aggregates
 *   - InvoiceLifecycleService: DRAFT → FINALIZED → PAID/VOID transitions
 *   - InvoiceNumberService: sequential invoice number generation
 *   - BillingPeriodService: period detection and advancement
 *   - InvoicesController: invoice CRUD + lifecycle endpoints
 *   - BillingLedgerController: ledger + balance endpoints
 */
import { Module } from '@nestjs/common';

import { BillingLedgerController } from './billing-ledger.controller';
import { BillingPeriodService } from './billing-period.service';
import { InvoiceGenerationService } from './invoice-generation.service';
import { InvoiceLifecycleService } from './invoice-lifecycle.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesController } from './invoices.controller';

@Module({
  controllers: [InvoicesController, BillingLedgerController],
  providers: [
    InvoiceGenerationService,
    InvoiceLifecycleService,
    InvoiceNumberService,
    BillingPeriodService,
  ],
  exports: [
    InvoiceGenerationService,
    InvoiceLifecycleService,
    BillingPeriodService,
  ],
})
export class InvoicesModule {}
