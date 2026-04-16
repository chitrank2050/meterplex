/**
 * Response DTOs for entitlement check and consume endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsInt, IsOptional, Min } from 'class-validator';

import { FeatureType } from '@prisma/client';

export class EntitlementCheckResponseDto {
  @ApiProperty({ example: true, description: 'Whether access is allowed' })
  allowed!: boolean;

  @ApiProperty({ example: 'api_calls' })
  feature!: string;

  @ApiProperty({ enum: FeatureType, example: 'QUOTA' })
  type!: string;

  @ApiPropertyOptional({
    example: 50000,
    nullable: true,
    description: 'Quota limit (QUOTA features only)',
  })
  limit?: number | null;

  @ApiPropertyOptional({
    example: 23456,
    nullable: true,
    description: 'Current usage count (QUOTA features only)',
  })
  used?: number | null;

  @ApiPropertyOptional({
    example: 26544,
    nullable: true,
    description: 'Remaining quota (QUOTA features only)',
  })
  remaining?: number | null;

  @ApiPropertyOptional({
    example: '2026-05-01T00:00:00.000Z',
    nullable: true,
    description: 'When the quota resets',
  })
  resetAt?: Date | null;

  @ApiPropertyOptional({
    example: 'Quota exceeded',
    nullable: true,
    description: 'Reason for denial (when allowed=false)',
  })
  reason?: string | null;
}

export class ConsumeResponseDto {
  @ApiProperty({ example: true })
  allowed!: boolean;

  @ApiProperty({ example: 'api_calls' })
  feature!: string;

  @ApiProperty({ example: 1, description: 'Units consumed in this request' })
  consumed!: number;

  @ApiProperty({ example: 23457 })
  used!: number;

  @ApiProperty({ example: 26543 })
  remaining!: number;

  @ApiProperty({
    example: false,
    description: 'Whether this usage exceeds the limit',
  })
  overage!: boolean;
}

export class ConsumeRequestDto {
  @ApiProperty({
    example: 1,
    description: 'Number of units to consume',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount!: number;
}
