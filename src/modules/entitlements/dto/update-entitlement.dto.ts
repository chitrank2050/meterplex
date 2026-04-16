/**
 * UpdateEntitlementDto - Validates the request body for updating an entitlement.
 *
 * featureId is NOT updatable - delete the entitlement and create
 * a new one if you need to change the feature.
 * All other fields are optional.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { LimitBehavior, ResetPeriod } from '@prisma/client';

export class UpdateEntitlementDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  value?: boolean;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number;

  @ApiPropertyOptional({ enum: LimitBehavior, example: 'HARD' })
  @IsOptional()
  @IsEnum(LimitBehavior)
  limitBehavior?: LimitBehavior;

  @ApiPropertyOptional({
    example: 5,
    description: 'Overage price in micro-cents',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  overagePrice?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  includedAmount?: number;

  @ApiPropertyOptional({ enum: ResetPeriod, example: 'MONTHLY' })
  @IsOptional()
  @IsEnum(ResetPeriod)
  resetPeriod?: ResetPeriod;
}
