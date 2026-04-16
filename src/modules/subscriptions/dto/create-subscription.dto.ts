/**
 * CreateSubscriptionDto - Validates the request body for subscribing a tenant to a plan.
 *
 * The tenant subscribes to a plan at a specific price.
 * On creation, the service:
 *   1. Validates plan, price, and tenant exist
 *   2. Checks no active subscription already exists for this tenant
 *   3. Creates the subscription record
 *   4. Snapshots all entitlements from the plan (frozen copy)
 *   5. Returns the subscription with snapshot summary
 *
 * Example request:
 *   POST /api/v1/subscriptions
 *   Headers: x-tenant-id: <tenant-uuid>
 *   {
 *     "planId": "...",
 *     "priceId": "...",
 *     "trialDays": 14
 *   }
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateSubscriptionDto {
  /**
   * The plan to subscribe to.
   */
  @ApiProperty({
    example: '0eed08b2-60b6-4578-ae98-a98f3b164c54',
    description: 'Plan UUID',
  })
  @IsUUID()
  planId!: string;

  /**
   * The specific price (interval + currency) to use.
   * Must belong to the specified plan and be active.
   */
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'PlanPrice UUID',
  })
  @IsUUID()
  priceId!: string;

  /**
   * Optional free trial period in days.
   * During trial, status = TRIALING. After trial ends, status → ACTIVE.
   * Range: 1-90 days. Omit for no trial.
   */
  @ApiPropertyOptional({
    example: 14,
    description: 'Trial period in days (1-90). Omit for no trial.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  trialDays?: number;
}
