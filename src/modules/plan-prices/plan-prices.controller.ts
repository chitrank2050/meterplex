/**
 * PlanPricesController - Manages pricing for plans.
 *
 * Prices are nested under plans:
 *   POST   /api/v1/plans/:planId/prices        → Add a price
 *   GET    /api/v1/plans/:planId/prices        → List prices
 *   PATCH  /api/v1/plans/:planId/prices/:id    → Deactivate a price
 *
 * Nested routing follows REST conventions for sub-resources.
 * The planId in the URL ensures prices are always accessed
 * in the context of their parent plan.
 */
// TODO: Add platform admin guard (isPlatformAdmin on User model)
// Currently any authenticated user can create/modify prices.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/dto';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import {
  CreatePlanPriceDto,
  PlanPriceListResponseDto,
  PlanPriceResponseDto,
} from './dto';
import { PlanPricesService } from './plan-prices.service';

@ApiTags('Plan Prices')
@Controller({
  path: 'plans/:planId/prices',
  version: '1',
})
export class PlanPricesController {
  constructor(private readonly planPricesService: PlanPricesService) {}

  /**
   * POST /api/v1/plans/:planId/prices
   *
   * Adds a new price to a plan. Amount is in smallest currency
   * unit (cents for USD). One active price per (plan, interval, currency).
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a price to a plan' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiResponse({
    status: 201,
    description: 'Price created',
    type: PlanPriceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Active price already exists for this interval/currency',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async create(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreatePlanPriceDto,
  ) {
    return this.planPricesService.create(planId, dto);
  }

  /**
   * GET /api/v1/plans/:planId/prices
   *
   * Lists all prices for a plan. By default, only active prices.
   * Pass ?includeInactive=true to see deactivated prices.
   */
  @Get()
  @ApiOperation({ summary: 'List prices for a plan' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    example: false,
    description: 'Include deactivated prices',
  })
  @ApiResponse({
    status: 200,
    description: 'List of prices',
    type: PlanPriceListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
    type: ErrorResponseDto,
  })
  async findAll(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.planPricesService.findAllForPlan(
      planId,
      includeInactive ?? false,
    );
  }

  /**
   * PATCH /api/v1/plans/:planId/prices/:id
   *
   * Deactivates a price. Deactivation is permanent for this record.
   * To change pricing: deactivate the old price, create a new one.
   * Existing subscriptions using this price are NOT affected.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a price' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiParam({ name: 'id', description: 'Price UUID' })
  @ApiResponse({
    status: 200,
    description: 'Price deactivated',
    type: PlanPriceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Price not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async deactivate(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.planPricesService.deactivate(planId, id);
  }
}
