/**
 * Response DTOs for audit log admin endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuditAction, AuditActorType } from '@prisma/client';

export class AuditLogResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'f239538d-...' })
  tenantId!: string;

  @ApiProperty({ example: 'e8c1a2b3-...' })
  actorId!: string;

  @ApiProperty({ enum: AuditActorType, example: AuditActorType.USER })
  actorType!: AuditActorType;

  @ApiProperty({ enum: AuditAction, example: AuditAction.UPDATE })
  action!: AuditAction;

  @ApiProperty({ example: 'tenant', description: 'Resource type affected' })
  resource!: string;

  @ApiProperty({
    example: 'a1b2c3d4-...',
    description: 'UUID of affected resource',
  })
  resourceId!: string;

  @ApiProperty({
    example: {
      requestedChanges: { name: 'New Name' },
      after: { name: 'New Name' },
    },
    description: 'Before/after changes payload',
  })
  changes!: Record<string, unknown>;

  @ApiPropertyOptional({ example: '192.168.1.1', nullable: true })
  ipAddress!: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...', nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({
    example: '13850bd4-08fe-4f22-bd5a-b09e13bc6ec2',
    nullable: true,
  })
  correlationId!: string | null;

  @ApiProperty({ example: '2026-05-22T08:34:08.751Z' })
  createdAt!: Date;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data!: AuditLogResponseDto[];

  @ApiProperty({
    example: { total: 42, page: 1, limit: 50, totalPages: 1 },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
