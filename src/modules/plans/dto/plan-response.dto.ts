/**
 * Response DTOs for plan endpoints.
 *
 * Defines the exact shape of every response for Scalar/Swagger
 * documentation. Field filtering is handled at the Prisma query
 * level via select - these DTOs are purely for documentation
 * and TypeScript type safety.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PlanPriceResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ enum: ['MONTHLY', 'ANNUALLY'], example: 'MONTHLY' })
  interval!: string;

  @ApiProperty({
    example: 9900,
    description: 'Amount in smallest currency unit (cents)',
  })
  amount!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class PlanResponseDto {
  @ApiProperty({ example: '0eed08b2-60b6-4578-ae98-a98f3b164c54' })
  id!: string;

  @ApiProperty({ example: 'Pro' })
  name!: string;

  @ApiProperty({ example: 'pro' })
  slug!: string;

  @ApiPropertyOptional({ example: 'For growing teams that need more power.' })
  description!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'], example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: true })
  isPublic!: boolean;

  @ApiProperty({ example: 2 })
  displayOrder!: number;

  @ApiProperty({ example: { trialDays: 14 } })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2026-04-10T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-10T12:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: [PlanPriceResponseDto] })
  prices?: PlanPriceResponseDto[];
}

export class PlanListResponseDto {
  @ApiProperty({ type: [PlanResponseDto] })
  data!: PlanResponseDto[];
}
