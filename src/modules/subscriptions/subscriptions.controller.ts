/**
 * SubscriptionsController - Tenant subscription management.
 *
 * Subscriptions are tenant-scoped - requires x-tenant-id header.
 *
 * Routes:
 *   POST   /api/v1/subscriptions         → Subscribe tenant to a plan
 *   GET    /api/v1/subscriptions/active   → Get active subscription
 *   GET    /api/v1/subscriptions         → List all subscriptions (history)
 *   POST   /api/v1/subscriptions/:id/cancel → Cancel subscription
 */
import {
  Body,
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

import { Roles, TenantId } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { RolesGuard, TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { MembershipRole } from '@prisma/client';

import {
  CreateSubscriptionDto,
  SubscriptionListResponseDto,
  SubscriptionResponseDto,
} from './dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller({
  path: 'subscriptions',
  version: '1',
})
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * POST /api/v1/subscriptions
   *
   * Subscribe the tenant to a plan at a specific price.
   * If the tenant already has an active subscription, it is
   * cancelled and replaced by the new one (upgrade/downgrade).
   *
   * Only OWNER and ADMIN can manage subscriptions.
   */
  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe tenant to a plan' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created with entitlement snapshots',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan or price not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Plan not active',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role',
    type: ErrorResponseDto,
  })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(tenantId, dto);
  }

  /**
   * GET /api/v1/subscriptions/active
   *
   * Returns the tenant's current active or trialing subscription
   * with plan details and entitlement snapshots.
   *
   * Must be defined BEFORE /:id route.
   */
  @Get('active')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @ApiOperation({ summary: 'Get active subscription for tenant' })
  @ApiResponse({
    status: 200,
    description: 'Active subscription with entitlement snapshots',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async findActive(@TenantId() tenantId: string) {
    return this.subscriptionsService.findActiveForTenant(tenantId);
  }

  /**
   * GET /api/v1/subscriptions
   *
   * Lists all subscriptions for the tenant, including cancelled ones.
   * Ordered by creation date (newest first).
   */
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @ApiOperation({ summary: 'List all subscriptions for tenant (history)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription history',
    type: SubscriptionListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async findAll(@TenantId() tenantId: string) {
    return this.subscriptionsService.findAllForTenant(tenantId);
  }

  /**
   * POST /api/v1/subscriptions/:id/cancel
   *
   * Cancels a subscription. The tenant keeps access until
   * currentPeriodEnd (cancel-at-end-of-period).
   *
   * Only OWNER and ADMIN can cancel subscriptions.
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @ApiOperation({ summary: 'Cancel a subscription (active until period end)' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role',
    type: ErrorResponseDto,
  })
  async cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptionsService.cancel(tenantId, id);
  }
}
