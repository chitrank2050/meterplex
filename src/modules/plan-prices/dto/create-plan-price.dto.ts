/**
 * CreatePlanPriceDto — Validates the request body for adding a price to a plan.
 *
 * Prices are attached to plans, not created independently.
 * The plan_id comes from the URL path, not the request body.
 *
 * Amount is in the smallest currency unit (cents for USD):
 *   $99.00 = 9900
 *   €89.50 = 8950
 *   $0.00  = 0 (free plan)
 *
 * Example request:
 *   POST /api/v1/plans/:planId/prices
 *   {
 *     "interval": "MONTHLY",
 *     "amount": 9900,
 *     "currency": "usd"
 *   }
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { BillingInterval } from '@prisma/client';

export class CreatePlanPriceDto {
  /**
   * Billing frequency. MONTHLY or ANNUALLY.
   */
  @ApiProperty({
    enum: BillingInterval,
    example: 'MONTHLY',
    description: 'Billing interval',
  })
  @IsEnum(BillingInterval)
  interval!: BillingInterval;

  /**
   * Price in smallest currency unit (cents for USD).
   * $99.00 = 9900. $0 = free plan. Must be non-negative.
   */
  @ApiProperty({
    example: 9900,
    description:
      'Amount in smallest currency unit (e.g., cents). $99.00 = 9900',
  })
  @IsInt()
  @Min(0)
  amount!: number;

  /**
   * ISO 4217 currency code, lowercase. Defaults to "usd".
   */
  @ApiPropertyOptional({
    example: 'usd',
    description: 'ISO 4217 currency code (lowercase)',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^[a-z]{3}$/, {
    message: 'currency must be a 3-letter lowercase ISO 4217 code',
  })
  currency?: string;
}
