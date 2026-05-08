/**
 * Response DTOs for the usage events ingestion endpoint.
 *
 * Per-event mixed response pattern:
 *   - accepted/rejected counts for quick client-side checks
 *   - per-event status so clients can retry failed events specifically
 *
 * Possible per-event statuses:
 *   - accepted: event passed validation, queued for processing
 *   - duplicate: eventId already exists, skipped (not an error)
 *   - rejected: event failed validation, reason provided
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UsageEventResultDto {
  @ApiProperty({ example: 'evt_client_abc123' })
  eventId!: string;

  @ApiProperty({
    enum: ['accepted', 'duplicate', 'rejected'],
    example: 'accepted',
    description:
      'accepted = queued for processing, duplicate = already seen, rejected = validation failed',
  })
  status!: 'accepted' | 'duplicate' | 'rejected';

  @ApiPropertyOptional({
    example: 'Feature "foobar" not found',
    description: 'Rejection reason (only present when status = rejected)',
  })
  reason?: string;
}

export class UsageEventsResponseDto {
  @ApiProperty({
    example: 99,
    description: 'Number of events accepted (includes duplicates)',
  })
  accepted!: number;

  @ApiProperty({
    example: 1,
    description: 'Number of events rejected due to validation failure',
  })
  rejected!: number;

  @ApiProperty({ type: [UsageEventResultDto] })
  events!: UsageEventResultDto[];
}
