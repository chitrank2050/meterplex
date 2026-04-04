/**
 * UpdateUserDto — Validates the request body for user profile updates.
 *
 * Password changes are handled separately via a dedicated endpoint
 * (not a generic PATCH) because they require the current password
 * for verification.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jonathan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe-Smith' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  /** Admin-only: enable or disable a user account. */
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
