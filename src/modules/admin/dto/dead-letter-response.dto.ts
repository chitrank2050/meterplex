/**
 * Response DTOs for dead letter event admin endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DeadLetterStage, DeadLetterStatus } from '@prisma/client';

export class DeadLetterResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiPropertyOptional({
    example: 'evt-acme-api_calls-2026-05',
    nullable: true,
  })
  sourceEventId!: string | null;

  @ApiPropertyOptional({ example: 'f239538d-...', nullable: true })
  tenantId!: string | null;

  @ApiProperty({
    example: 'usage.raw',
    description: 'Kafka topic where failure occurred',
  })
  topic!: string;

  @ApiProperty({ enum: DeadLetterStage, example: DeadLetterStage.VALIDATION })
  failureStage!: DeadLetterStage;

  @ApiProperty({
    example: 'Feature foobar not in plan',
    description: 'Human-readable failure reason',
  })
  failureReason!: string;

  @ApiProperty({
    example: { eventId: 'evt-123', tenantId: 'uuid', amount: 5 },
    description: 'Original event payload at time of failure',
  })
  originalPayload!: Record<string, unknown>;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Stack trace or detailed error info',
  })
  errorDetails!: string | null;

  @ApiProperty({ example: 0, description: 'Number of manual retry attempts' })
  retryCount!: number;

  @ApiProperty({ enum: DeadLetterStatus, example: DeadLetterStatus.FAILED })
  status!: DeadLetterStatus;

  @ApiProperty({ example: '2026-05-22T08:34:08.751Z' })
  firstFailedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  lastAttemptedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt!: Date | null;

  @ApiPropertyOptional({
    example: 'e8c1a2b3-...',
    nullable: true,
    description: 'Admin who resolved/discarded',
  })
  resolvedBy!: string | null;

  @ApiProperty({ example: '2026-05-22T08:34:08.751Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-22T08:34:08.751Z' })
  updatedAt!: Date;
}

export class DeadLetterListResponseDto {
  @ApiProperty({ type: [DeadLetterResponseDto] })
  data!: DeadLetterResponseDto[];

  @ApiProperty({
    example: { total: 5, page: 1, limit: 50, totalPages: 1 },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
