/**
 * ResetPasswordDto - Validates the password reset request body.
 *
 * This is the second step of the forgot-password flow:
 *   1. POST /auth/forgot-password → receives a reset token
 *   2. POST /auth/reset-password  → submits token + new password
 *
 * After a successful reset:
 *   - The user's password is updated (bcrypt-hashed)
 *   - The reset token is marked as used (cannot be reused)
 *   - ALL refresh tokens are revoked (forces re-login on every device)
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  /**
   * The raw reset token received from the forgot-password endpoint.
   * This is a 32-byte crypto-random string encoded as base64url.
   * The server stores only its SHA-256 hash - this raw value
   * is the only way to prove ownership.
   */
  @ApiProperty({
    example: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345678901234',
    description: 'Reset token from forgot-password response or email',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  /**
   * The new password. Same strength requirements as registration:
   * 8-72 chars, at least one uppercase, one lowercase, one number.
   * 72 is bcrypt's max input length - anything beyond is silently truncated.
   */
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
