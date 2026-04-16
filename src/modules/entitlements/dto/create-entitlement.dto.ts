/**
 * CreateEntitlementDto - Validates the request body for mapping a feature to a plan.
 *
 * The shape of the request depends on the feature type:
 *
 *   BOOLEAN: { "featureId": "...", "value": true }
 *   QUOTA:   { "featureId": "...", "limit": 50000, "limitBehavior": "SOFT",
 *              "overagePrice": 10, "resetPeriod": "MONTHLY" }
 *   METERED: { "featureId": "...", "includedAmount": 10, "overagePrice": 200,
 *              "resetPeriod": "MONTHLY" }
 *
 * The planId comes from the URL path: POST /api/v1/plans/:planId/entitlements
 *
 * overagePrice is in micro-cents (1/10000th of currency unit):
 *   $0.001/call = 10 micro-cents
 *   $0.02/GB    = 200 micro-cents
 *   $10/seat    = 100000 micro-cents
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { LimitBehavior, ResetPeriod } from '@prisma/client';

export class CreateEntitlementDto {
  /**
   * The feature to attach to this plan.
   */
  @ApiProperty({
    example: 'b1ccfb75-6d33-4be4-9556-6f3ac55456a1',
    description: 'Feature UUID',
  })
  @IsUUID()
  featureId!: string;

  /**
   * For BOOLEAN features: true = granted, false = explicitly denied.
   */
  @ApiPropertyOptional({
    example: true,
    description: 'Boolean access flag (for BOOLEAN features)',
  })
  @IsOptional()
  @IsBoolean()
  value?: boolean;

  /**
   * For QUOTA features: the numeric limit per reset period.
   * Example: 50000 (API calls per month).
   */
  @ApiPropertyOptional({
    example: 50000,
    description: 'Numeric limit per reset period (for QUOTA features)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number;

  /**
   * What happens when the limit is exceeded.
   * HARD = blocked. SOFT = allowed, charged overage.
   */
  @ApiPropertyOptional({
    enum: LimitBehavior,
    example: 'SOFT',
    description: 'HARD = block at limit, SOFT = allow overage + charge',
  })
  @IsOptional()
  @IsEnum(LimitBehavior)
  limitBehavior?: LimitBehavior;

  /**
   * Per-unit charge beyond limit (SOFT quota) or beyond includedAmount (METERED).
   * In micro-cents: $0.001 = 10, $0.02 = 200, $10 = 100000.
   */
  @ApiPropertyOptional({
    example: 10,
    description: 'Overage price in micro-cents ($0.001 = 10)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  overagePrice?: number;

  /**
   * For METERED features: units included before overage kicks in.
   * Example: 10 (first 10 GB free, then overage pricing).
   */
  @ApiPropertyOptional({
    example: 10,
    description: 'Free units before overage applies (for METERED features)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  includedAmount?: number;

  /**
   * When the quota counter resets: MONTHLY, ANNUALLY, or NEVER.
   */
  @ApiPropertyOptional({
    enum: ResetPeriod,
    example: 'MONTHLY',
    description: 'Quota reset frequency',
  })
  @IsOptional()
  @IsEnum(ResetPeriod)
  resetPeriod?: ResetPeriod;
}
