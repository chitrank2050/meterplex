/**
 * EntitlementsController - Maps features to plans with access rules.
 *
 * Nested under plans: /api/v1/plans/:planId/entitlements
 *
 * Routes:
 *   POST   /api/v1/plans/:planId/entitlements       → Add feature to plan
 *   GET    /api/v1/plans/:planId/entitlements       → List plan's entitlements
 *   GET    /api/v1/plans/:planId/entitlements/:id   → Get entitlement by ID
 *   PATCH  /api/v1/plans/:planId/entitlements/:id   → Update entitlement rules
 *   DELETE /api/v1/plans/:planId/entitlements/:id   → Remove feature from plan
 */
// TODO: Add platform admin guard
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/dto';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import {
  CreateEntitlementDto,
  EntitlementListResponseDto,
  EntitlementResponseDto,
  UpdateEntitlementDto,
} from './dto';
import { EntitlementsService } from './entitlements.service';

@ApiTags('Entitlements')
@Controller({
  path: 'plans/:planId/entitlements',
  version: '1',
})
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  /**
   * POST /api/v1/plans/:planId/entitlements
   *
   * Maps a feature to a plan with access rules.
   * The request shape depends on the feature type (BOOLEAN/QUOTA/METERED).
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a feature to a plan with access rules' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiResponse({
    status: 201,
    description: 'Entitlement created',
    type: EntitlementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan or feature not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Feature already mapped to this plan',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Fields do not match feature type',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async create(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateEntitlementDto,
  ) {
    return this.entitlementsService.create(planId, dto);
  }

  /**
   * GET /api/v1/plans/:planId/entitlements
   *
   * Lists all features mapped to this plan with their access rules.
   */
  @Get()
  @ApiOperation({ summary: 'List entitlements for a plan' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of entitlements with feature details',
    type: EntitlementListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
    type: ErrorResponseDto,
  })
  async findAll(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.entitlementsService.findAllForPlan(planId);
  }

  /**
   * GET /api/v1/plans/:planId/entitlements/:id
   *
   * Get a single entitlement by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get entitlement by ID' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiParam({ name: 'id', description: 'Entitlement UUID' })
  @ApiResponse({
    status: 200,
    description: 'Entitlement details',
    type: EntitlementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entitlement not found',
    type: ErrorResponseDto,
  })
  async findById(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entitlementsService.findById(planId, id);
  }

  /**
   * PATCH /api/v1/plans/:planId/entitlements/:id
   *
   * Update an entitlement's access rules. featureId is immutable.
   * Changes do NOT affect existing subscribers (they use snapshots).
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update entitlement access rules' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiParam({ name: 'id', description: 'Entitlement UUID' })
  @ApiResponse({
    status: 200,
    description: 'Entitlement updated',
    type: EntitlementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entitlement not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Fields do not match feature type',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async update(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntitlementDto,
  ) {
    return this.entitlementsService.update(planId, id, dto);
  }

  /**
   * DELETE /api/v1/plans/:planId/entitlements/:id
   *
   * Removes a feature from a plan. Hard delete - entitlements are
   * just mappings. Existing subscribers are NOT affected.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a feature from a plan' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiParam({ name: 'id', description: 'Entitlement UUID' })
  @ApiResponse({
    status: 200,
    description: 'Entitlement removed',
    type: EntitlementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entitlement not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async remove(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entitlementsService.remove(planId, id);
  }
}
