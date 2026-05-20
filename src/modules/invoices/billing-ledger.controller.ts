/**
 * BillingLedgerController - View ledger entries and balance.
 *
 * Routes:
 *   GET /api/v1/billing/ledger   → List ledger entries for tenant
 *   GET /api/v1/billing/balance  → Get current balance
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PrismaService } from '@app-prisma/prisma.service';

import { TenantId } from '@common/decorators';
import { TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@ApiTags('Billing')
@Controller({
  path: 'billing',
  version: '1',
})
export class BillingLedgerController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/billing/ledger
   *
   * List all ledger entries for the tenant, newest first.
   */
  @Get('ledger')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'List billing ledger entries' })
  @ApiResponse({ status: 200, description: 'Ledger entries' })
  async getLedger(@TenantId() tenantId: string) {
    const entries = await this.prisma.billingLedgerEntry.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: entries };
  }

  /**
   * GET /api/v1/billing/balance
   *
   * Calculate the tenant's current balance.
   * Balance = SUM(debit) - SUM(credit)
   * Positive = tenant owes money. Negative = tenant has credit.
   */
  @Get('balance')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'Get tenant billing balance' })
  @ApiResponse({ status: 200, description: 'Current balance' })
  async getBalance(@TenantId() tenantId: string) {
    const result = await this.prisma.billingLedgerEntry.aggregate({
      where: { tenantId },
      _sum: { debit: true, credit: true },
    });

    const totalDebit = result._sum.debit ?? 0;
    const totalCredit = result._sum.credit ?? 0;
    const balance = totalDebit - totalCredit;

    return {
      tenantId,
      currency: 'usd',
      balance,
      totalCharged: totalDebit,
      totalPaid: totalCredit,
      unit: 'cents',
      asOf: new Date().toISOString(),
    };
  }
}
