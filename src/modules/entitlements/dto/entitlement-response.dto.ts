/**
 * Response DTOs for entitlement endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FeatureType, LimitBehavior, ResetPeriod } from '@prisma/client';

class EntitlementFeatureDto {
  @ApiProperty({ example: 'b1ccfb75-...' })
  id!: string;

  @ApiProperty({ example: 'API Calls' })
  name!: string;

  @ApiProperty({ example: 'api_calls' })
  lookupKey!: string;

  @ApiProperty({ enum: FeatureType, example: 'QUOTA' })
  type!: string;

  @ApiPropertyOptional({ example: 'calls', nullable: true })
  unit!: string | null;
}

export class EntitlementResponseDto {
  @ApiProperty({ example: 'ec2decdf-...' })
  id!: string;

  @ApiProperty({ example: '0eed08b2-...' })
  planId!: string;

  @ApiProperty({ example: 'b1ccfb75-...' })
  featureId!: string;

  @ApiPropertyOptional({ example: true, nullable: true })
  value!: boolean | null;

  @ApiPropertyOptional({ example: 50000, nullable: true })
  limit!: number | null;

  @ApiPropertyOptional({
    enum: LimitBehavior,
    example: 'SOFT',
    nullable: true,
  })
  limitBehavior!: string | null;

  @ApiPropertyOptional({
    example: 10,
    description: 'Micro-cents',
    nullable: true,
  })
  overagePrice!: number | null;

  @ApiPropertyOptional({ example: 10, nullable: true })
  includedAmount!: number | null;

  @ApiPropertyOptional({
    enum: ResetPeriod,
    example: 'MONTHLY',
    nullable: true,
  })
  resetPeriod!: string | null;

  @ApiProperty({ type: EntitlementFeatureDto })
  feature!: EntitlementFeatureDto;

  @ApiProperty({ example: '2026-04-10T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-10T12:00:00.000Z' })
  updatedAt!: Date;
}

export class EntitlementListResponseDto {
  @ApiProperty({ type: [EntitlementResponseDto] })
  data!: EntitlementResponseDto[];
}
