/**
 * UpdateFeatureDto - Validates the request body for feature updates.
 *
 * All fields are optional - only provided fields are updated.
 * lookup_key and type are NOT updatable:
 *   - lookup_key: code depends on it, changing breaks entitlement checks
 *   - type: entitlements are structured around the type, changing it
 *     would invalidate existing entitlement configurations
 */
import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PlanStatus } from '@prisma/client';

export class UpdateFeatureDto {
  @ApiPropertyOptional({
    example: 'API Requests',
    description: 'Updated feature name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'requests' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({
    example: 'Total API requests allowed per billing period',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    enum: PlanStatus,
    example: 'ARCHIVED',
    description: 'ARCHIVED = cannot be added to new entitlements',
  })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({ example: { category: 'core' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
