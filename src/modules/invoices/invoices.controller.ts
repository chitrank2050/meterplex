/**
 * InvoicesController - Invoice management endpoints.
 *
 * Routes:
 *   GET    /api/v1/invoices              → List invoices for tenant
 *   GET    /api/v1/invoices/:id          → Get invoice with line items
 *   POST   /api/v1/invoices/generate     → Manually trigger invoice generation
 *   POST   /api/v1/invoices/:id/finalize → DRAFT → FINALIZED
 *   POST   /api/v1/invoices/:id/mark-paid → FINALIZED → PAID
 *   POST   /api/v1/invoices/:id/void     → DRAFT/FINALIZED → VOID
 *
 * All endpoints are tenant-scoped (require x-tenant-id header).
 */
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PrismaService } from '@app-prisma/prisma.service';

import { Roles, TenantId } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { RolesGuard, TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { MembershipRole } from '@prisma/client';

import { BillingPeriodService } from './billing-period.service';
import { InvoiceGenerationService } from './invoice-generation.service';
import { InvoiceLifecycleService } from './invoice-lifecycle.service';

@ApiTags('Invoices')
@Controller({
  path: 'invoices',
  version: '1',
})
export class InvoicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGeneration: InvoiceGenerationService,
    private readonly invoiceLifecycle: InvoiceLifecycleService,
    private readonly billingPeriod: BillingPeriodService,
  ) {}

  /**
   * GET /api/v1/invoices
   *
   * List all invoices for the tenant, newest first.
   */
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'List invoices for tenant' })
  @ApiResponse({ status: 200, description: 'Invoice list' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async findAll(@TenantId() tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: invoices };
  }

  /**
   * GET /api/v1/invoices/:id
   *
   * Get a single invoice with all line items.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'Get invoice with line items' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) {
      return { statusCode: 404, message: 'Invoice not found' };
    }

    return invoice;
  }

  /**
   * POST /api/v1/invoices/generate
   *
   * Manually trigger invoice generation for the tenant's subscription.
   * Automatically detects the subscription state:
   *   - Active subscription → full-period invoice
   *   - Cancelled subscription → prorated invoice (days used / total days)
   *
   * The frontend calls this one endpoint. The backend handles the logic.
   * OWNER/ADMIN only.
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate invoice (auto-detects full or prorated)' })
  @ApiResponse({ status: 201, description: 'Invoice generated' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async generate(@TenantId() tenantId: string) {
    // Find the most recent subscription (active or cancelled)
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIALING', 'CANCELLED'] },
      },
      select: {
        id: true,
        tenantId: true,
        planId: true,
        priceId: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        billingAnchor: true,
        cancelledAt: true,
        plan: { select: { id: true, name: true, slug: true } },
        price: {
          select: { id: true, interval: true, amount: true, currency: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return { statusCode: 404, message: 'No subscription found' };
    }

    // Cancelled mid-cycle → prorated invoice
    if (
      subscription.cancelledAt &&
      subscription.cancelledAt < subscription.currentPeriodEnd
    ) {
      return this.invoiceGeneration.generateProrated(
        subscription,
        subscription.cancelledAt,
      );
    }

    // Active/trialing → full-period invoice
    return this.invoiceGeneration.generate(subscription);
  }

  /**
   * POST /api/v1/invoices/:id/finalize
   *
   * DRAFT → FINALIZED. Assigns invoice number, creates ledger CHARGE.
   */
  @Post(':id/finalize')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'Finalize a draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice finalized' })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.invoiceLifecycle.finalize(id, tenantId);
  }

  /**
   * POST /api/v1/invoices/:id/mark-paid
   *
   * FINALIZED → PAID. Creates ledger PAYMENT entry.
   * Manual placeholder until Phase 5 payment provider integration.
   */
  @Post(':id/mark-paid')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice marked paid' })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.invoiceLifecycle.markPaid(id, tenantId);
  }

  /**
   * POST /api/v1/invoices/:id/void
   *
   * DRAFT/FINALIZED → VOID. Creates ledger CREDIT if was finalized.
   */
  @Post(':id/void')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'Void an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice voided' })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.invoiceLifecycle.void(id, tenantId);
  }
}
