/**
 * BillingLedgerController - View ledger entries and balance.
 *
 * Routes:
 *   GET /api/v1/billing/ledger   → List ledger entries for tenant
 *   GET /api/v1/billing/balance  → Get current balance
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PrismaService } from '@app-prisma/prisma.service';

import { TenantId } from '@common/decorators';
import { TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { BalanceResponseDto, LedgerListResponseDto } from './dto';

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
   * List ledger entries for the tenant, newest first. Paginated.
   * Optionally filter by type (CHARGE, PAYMENT, CREDIT, REFUND, ADJUSTMENT).
   */
  @Get('ledger')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'List billing ledger entries' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['CHARGE', 'PAYMENT', 'CREDIT', 'REFUND', 'ADJUSTMENT'],
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated ledger entries',
    type: LedgerListResponseDto,
  })
  async getLedger(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    const pageNum = Math.max(1, page ?? 1);
    const pageSize = Math.min(100, Math.max(1, limit ?? 20));
    const skip = (pageNum - 1) * pageSize;

    const where = {
      tenantId,
      ...(type && { type: type as any }),
    };

    const [entries, total] = await Promise.all([
      this.prisma.billingLedgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.billingLedgerEntry.count({ where }),
    ]);

    return {
      data: entries,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
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
  @ApiResponse({
    status: 200,
    description: 'Current balance',
    type: BalanceResponseDto,
  })
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
