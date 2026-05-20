/**
 * InvoiceNumberService - Generates sequential, human-readable invoice numbers.
 *
 * Format: INV-{YEAR}-{SEQUENCE}
 * Example: INV-2026-0001, INV-2026-0002, ...
 *
 * Sequence resets annually. Globally unique (not per-tenant).
 * Generated atomically using Postgres advisory lock + counter table
 * to prevent duplicate numbers under concurrent generation.
 *
 * Invoice numbers are assigned at FINALIZE, not at creation.
 * DRAFT invoices don't have numbers - prevents gaps from voided drafts.
 */
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

@Injectable()
export class InvoiceNumberService {
  private readonly logger = new Logger(InvoiceNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate the next invoice number for the current year.
   *
   * Uses raw SQL with an atomic upsert on a counter row to guarantee
   * no two invoices get the same number, even under concurrent generation.
   *
   * @returns Invoice number string: "INV-2026-0001"
   */
  async generateNext(): Promise<string> {
    const year = new Date().getFullYear();

    // Atomic upsert: increment counter or create with value 1
    const result = await this.prisma.$queryRawUnsafe<
      Array<{ next_value: number }>
    >(
      `INSERT INTO invoice_sequences (year, last_value)
      VALUES ($1, 1)
      ON CONFLICT (year)
      DO UPDATE SET last_value = invoice_sequences.last_value + 1
      RETURNING last_value AS next_value`,
      year,
    );

    const sequence = result[0].next_value;
    const invoiceNumber = `INV-${year}-${String(sequence).padStart(4, '0')}`;

    this.logger.log(`Generated invoice number: ${invoiceNumber}`);
    return invoiceNumber;
  }
}
