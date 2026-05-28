/**
 * Response DTOs for reconciliation admin endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ReconciliationIssueStatus,
  ReconciliationRunStatus,
} from '@prisma/client';

export class ReconciliationRunResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: '2026-05-22T00:30:00.000Z' })
  ranAt!: Date;

  @ApiPropertyOptional({
    example: 4500,
    nullable: true,
    description: 'Duration in milliseconds',
  })
  durationMs!: number | null;

  @ApiProperty({
    example: 6,
    description: 'Tenant+feature+period combinations checked',
  })
  tenantsChecked!: number;

  @ApiProperty({ example: 1, description: 'Number of mismatches found' })
  issuesFound!: number;

  @ApiProperty({
    enum: ReconciliationRunStatus,
    example: ReconciliationRunStatus.COMPLETED,
  })
  status!: ReconciliationRunStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Error message if run failed',
  })
  error!: string | null;

  @ApiProperty({
    example: 'cron',
    description: 'Who triggered: cron or admin UUID',
  })
  triggeredBy!: string;

  @ApiProperty({ example: '2026-05-22T00:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-22T00:30:04.500Z' })
  updatedAt!: Date;
}

export class ReconciliationRunListResponseDto {
  @ApiProperty({ type: [ReconciliationRunResponseDto] })
  data!: ReconciliationRunResponseDto[];

  @ApiProperty({
    example: { total: 10, page: 1, limit: 20, totalPages: 1 },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ReconciliationIssueResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({
    example: 'b5c6d7e8-...',
    description: 'Reconciliation run ID',
  })
  runId!: string;

  @ApiProperty({
    example: 'usage',
    description: 'Issue category: usage or subscription_payment',
  })
  category!: string;

  @ApiProperty({ example: 'f239538d-...' })
  tenantId!: string;

  @ApiProperty({ example: 'api_calls' })
  featureLookupKey!: string;

  @ApiProperty({ example: '2026-05', description: 'Billing period key' })
  periodKey!: string;

  @ApiProperty({ example: 35000, description: 'SUM(usage_events.amount)' })
  expected!: number;

  @ApiProperty({ example: 34998, description: 'usage_aggregates.amount' })
  actual!: number;

  @ApiProperty({ example: 2, description: 'expected - actual' })
  difference!: number;

  @ApiProperty({
    enum: ReconciliationIssueStatus,
    example: ReconciliationIssueStatus.OPEN,
  })
  status!: ReconciliationIssueStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Admin notes for resolution',
  })
  notes!: string | null;

  @ApiProperty({ example: '2026-05-22T00:30:04.500Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-22T00:30:04.500Z' })
  updatedAt!: Date;
}

export class ReconciliationIssueListResponseDto {
  @ApiProperty({ type: [ReconciliationIssueResponseDto] })
  data!: ReconciliationIssueResponseDto[];

  @ApiProperty({
    example: { total: 1, page: 1, limit: 50, totalPages: 1 },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
