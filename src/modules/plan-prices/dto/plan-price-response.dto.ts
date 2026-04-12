/**
 * Response DTOs for plan price endpoints.
 */
import { ApiProperty } from '@nestjs/swagger';

export class PlanPriceResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: '0eed08b2-60b6-4578-ae98-a98f3b164c54' })
  planId!: string;

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

  @ApiProperty({ example: '2026-04-10T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-10T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PlanPriceListResponseDto {
  @ApiProperty({ type: [PlanPriceResponseDto] })
  data!: PlanPriceResponseDto[];
}
