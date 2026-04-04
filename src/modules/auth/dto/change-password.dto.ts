/**
 * ChangePasswordDto — Validates the change password request body.
 *
 * This is for authenticated users who know their current password
 * and want to set a new one. This is NOT the forgot-password flow.
 *
 * Difference between change and reset:
 *   - Change: user is logged in, knows current password, wants a new one
 *   - Reset: user is locked out, proves identity via reset token
 *
 * After a successful change:
 *   - Password is updated
 *   - ALL other refresh tokens are revoked (logs out other devices)
 *   - New token pair is returned so the current session continues
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ChangePasswordDto {
  /**
   * Current password for verification.
   * This prevents an attacker who has a stolen access token
   * from changing the password — they'd also need to know
   * the current password.
   */
  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  /** New password. Same strength rules as registration. */
  @ApiProperty({ example: 'NewSecurePass456' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;
}
