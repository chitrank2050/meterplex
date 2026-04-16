/**
 * EntitlementCheckController - Runtime entitlement evaluation.
 *
 * These are the endpoints your application calls to gate features:
 *   GET  /api/v1/entitlements/:featureKey/check   → Can this tenant use X?
 *   POST /api/v1/entitlements/:featureKey/consume  → Use 1 unit of X
 *
 * Both endpoints are tenant-scoped (require x-tenant-id header).
 * Both support JWT auth AND API key auth (server-to-server).
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

import { TenantId } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import {
  ConsumeRequestDto,
  ConsumeResponseDto,
  EntitlementCheckResponseDto,
} from './dto';
import { EntitlementCheckService } from './entitlement-check.service';

@ApiTags('Entitlement Checks')
@Controller({
  path: 'entitlements',
  version: '1',
})
export class EntitlementCheckController {
  constructor(
    private readonly entitlementCheckService: EntitlementCheckService,
  ) {}

  /**
   * GET /api/v1/entitlements/:featureKey/check
   *
   * Check if the tenant has access to a feature.
   * Returns allowed=true/false with usage details for QUOTA features.
   */
  @Get(':featureKey/check')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @ApiOperation({ summary: 'Check if tenant can use a feature' })
  @ApiParam({
    name: 'featureKey',
    example: 'api_calls',
    description: 'Feature lookup key',
  })
  @ApiResponse({
    status: 200,
    description: 'Entitlement check result',
    type: EntitlementCheckResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async check(
    @TenantId() tenantId: string,
    @Param('featureKey') featureKey: string,
  ) {
    return this.entitlementCheckService.check(tenantId, featureKey);
  }

  /**
   * POST /api/v1/entitlements/:featureKey/consume
   *
   * Consume units of a quota or metered feature.
   * For HARD quotas: returns 403 if limit exceeded.
   * For SOFT quotas: allows but flags as overage.
   * For METERED: always allows, tracks for billing.
   */
  @Post(':featureKey/consume')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume units of a feature' })
  @ApiParam({
    name: 'featureKey',
    example: 'api_calls',
    description: 'Feature lookup key',
  })
  @ApiResponse({
    status: 200,
    description: 'Consumption result',
    type: ConsumeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Quota exceeded (HARD limit)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feature not found in plan or no active subscription',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async consume(
    @TenantId() tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: ConsumeRequestDto,
  ) {
    return this.entitlementCheckService.consume(
      tenantId,
      featureKey,
      dto.amount ?? 1,
    );
  }
}
