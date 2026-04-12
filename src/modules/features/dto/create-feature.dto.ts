/**
 * CreateFeatureDto - Validates the request body for feature creation.
 *
 * Features are the global catalog of capabilities your platform offers.
 * They exist independently of plans - a feature like "API Calls" is
 * defined once, then attached to multiple plans with different limits
 * via entitlements.
 *
 * The lookup_key is the stable programmatic identifier:
 *   GET /entitlements/api_calls/check
 * It's immutable after creation - code depends on it.
 *
 * Example request:
 *   {
 *     "name": "API Calls",
 *     "lookupKey": "api_calls",
 *     "type": "QUOTA",
 *     "unit": "calls",
 *     "description": "Number of API requests per billing period"
 *   }
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { FeatureType } from '@prisma/client';

export class CreateFeatureDto {
  /**
   * Human-readable feature name shown on pricing pages.
   */
  @ApiProperty({ example: 'API Calls', description: 'Feature name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * Stable programmatic identifier used in entitlement checks.
   * Lowercase, underscores, no spaces. Immutable after creation.
   * This is what your code checks: GET /entitlements/api_calls/check
   */
  @ApiProperty({
    example: 'api_calls',
    description: 'Programmatic identifier (lowercase, underscores only)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, {
    message: 'lookupKey must be lowercase alphanumeric with underscores only',
  })
  lookupKey!: string;

  /**
   * How this feature is gated:
   *   BOOLEAN - on/off (SSO, webhooks, priority support)
   *   QUOTA   - numeric limit per period (50,000 API calls/month)
   *   METERED - usage-based billing ($0.02/GB storage)
   */
  @ApiProperty({
    enum: FeatureType,
    example: 'QUOTA',
    description: 'Feature gating type',
  })
  @IsEnum(FeatureType as object)
  type!: FeatureType;

  /**
   * Human-readable measurement unit for QUOTA and METERED features.
   * "calls", "GB", "seats", "messages". Null for BOOLEAN features.
   */
  @ApiPropertyOptional({
    example: 'calls',
    description:
      'Measurement unit (required for QUOTA/METERED, null for BOOLEAN)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  /**
   * Optional description for documentation and pricing pages.
   */
  @ApiPropertyOptional({
    example: 'Number of API requests per billing period',
    description: 'Feature description for pricing pages',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  /**
   * Flexible metadata bag.
   */
  @ApiPropertyOptional({
    example: { category: 'usage' },
    description: 'Custom metadata key-value pairs',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
