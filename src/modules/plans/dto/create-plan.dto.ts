/**
 * CreatePlanDto - Validates the request body for plan creation.
 *
 * Plans are the product identity: "Starter", "Pro", "Enterprise".
 * Pricing is NOT part of the plan - that's handled by PlanPrice
 * in a separate endpoint. This separation follows the Stripe
 * Product/Price pattern (2026 API).
 *
 * Example request:
 *   {
 *     "name": "Pro",
 *     "slug": "pro",
 *     "description": "For growing teams that need more power.",
 *     "isPublic": true,
 *     "displayOrder": 2,
 *     "metadata": { "trialDays": 14 }
 *   }
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  /**
   * Human-readable plan name shown on pricing pages.
   */
  @ApiProperty({ example: 'Pro', description: 'Plan name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * URL-safe identifier. Lowercase, hyphens, no spaces.
   * Used in API paths: /api/v1/plans/pro
   * Immutable after creation - changing it breaks API references.
   */
  @ApiProperty({
    example: 'pro',
    description: 'URL-safe unique identifier (lowercase, hyphens only)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens only',
  })
  slug!: string;

  /**
   * Optional marketing description for pricing pages.
   */
  @ApiPropertyOptional({
    example: 'For growing teams that need more power.',
    description: 'Marketing description shown on pricing pages',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  /**
   * Whether this plan appears on public pricing pages.
   * False = hidden/custom/enterprise plans visible only via direct link.
   */
  @ApiPropertyOptional({
    example: true,
    description: 'Show on public pricing pages?',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  /**
   * Controls display order on pricing pages. Lower = first.
   * Starter = 1, Pro = 2, Enterprise = 3.
   */
  @ApiPropertyOptional({
    example: 2,
    description: 'Sort order on pricing page (lower = first)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  /**
   * Flexible metadata bag for plan-specific settings.
   * Example: { "trialDays": 14, "supportTier": "priority" }
   */
  @ApiPropertyOptional({
    example: { trialDays: 14 },
    description: 'Custom metadata key-value pairs',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
