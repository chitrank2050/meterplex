/**
 * Response DTOs for user endpoints.
 *
 * Note: passwordHash is NEVER included in any response DTO.
 * These DTOs enforce that guarantee at the documentation level.
 */
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'b1ccfb75-6d33-4be4-9556-6f3ac55456a1' })
  id!: string;

  @ApiProperty({ example: 'alice@meterplex.dev' })
  email!: string;

  @ApiProperty({ example: 'Alice' })
  firstName!: string;

  @ApiProperty({ example: 'Johnson' })
  lastName!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-04T12:00:00.000Z' })
  updatedAt!: Date;
}
