/**
 * CreateUsageEventsDto - Batch request body for submitting usage events.
 *
 * Following the Stripe Meter Events + AWS CloudWatch PutMetricData pattern:
 * clients always send an array of events, even for a single event.
 *
 * Why batch-only:
 *   - Real SDKs buffer events and flush on timer/threshold
 *   - One API contract to maintain, one test surface
 *   - Matches industry convention (Stripe, AWS, Datadog)
 *
 * Per-event validation:
 *   - eventId: client-generated UUID, used as idempotency key
 *   - feature: lookup key of the feature being consumed
 *   - amount: positive integer in the feature's smallest unit
 *     (MB for storage, calls for api_calls, etc.)
 *   - timestamp: when the event happened (not when submitted)
 *   - metadata: optional freeform context
 *
 * Example:
 *   POST /api/v1/usage/events
 *   Authorization: Bearer mp_live_...
 *   {
 *     "events": [
 *       {
 *         "eventId": "evt_client_abc123",
 *         "feature": "api_calls",
 *         "amount": 1,
 *         "timestamp": "2026-04-16T10:30:00Z",
 *         "metadata": { "endpoint": "/v1/widgets" }
 *       }
 *     ]
 *   }
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Max events per batch. Prevents memory exhaustion from huge payloads. */
export const MAX_EVENTS_PER_BATCH = 1000;

export class UsageEventInputDto {
  /**
   * Client-generated idempotency key.
   * Same eventId submitted twice = processed once.
   * Recommended: UUID v4, but any unique string up to 255 chars works.
   */
  @ApiProperty({
    example: 'evt_client_abc123',
    description: 'Unique event identifier for idempotency',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventId!: string;

  /**
   * Feature lookup key being consumed.
   * Must match an existing feature and be included in the tenant's plan.
   */
  @ApiProperty({
    example: 'api_calls',
    description: 'Feature lookup key (e.g., "api_calls", "storage")',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, {
    message: 'feature must be a valid lookup key (lowercase, underscores only)',
  })
  feature!: string;

  /**
   * Units consumed. Positive integer.
   * Use the feature's smallest unit (MB for storage, not GB).
   */
  @ApiProperty({
    example: 1,
    description: 'Number of units consumed (positive integer)',
  })
  @IsInt()
  @Min(1)
  amount!: number;

  /**
   * When the event happened (client time, ISO 8601).
   * Used for billing period assignment and late-event detection.
   */
  @ApiProperty({
    example: '2026-04-16T10:30:00Z',
    description: 'When the event occurred (ISO 8601 UTC)',
  })
  @IsISO8601()
  timestamp!: string;

  /**
   * Optional freeform metadata.
   * Useful for debugging and analytics. Not required for billing.
   */
  @ApiPropertyOptional({
    example: { endpoint: '/v1/widgets', userAgent: 'MyApp/1.0' },
    description: 'Optional client-supplied context',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateUsageEventsDto {
  /**
   * Array of usage events to ingest.
   * Min 1, max 1000 per request.
   */
  @ApiProperty({
    type: [UsageEventInputDto],
    description: `Batch of usage events (1-${MAX_EVENTS_PER_BATCH} per request)`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_EVENTS_PER_BATCH)
  @ValidateNested({ each: true })
  @Type(() => UsageEventInputDto)
  events!: UsageEventInputDto[];
}
