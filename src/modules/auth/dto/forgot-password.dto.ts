/**
 * ForgotPasswordDto — Validates the forgot password request body.
 *
 * Only requires an email. The response is always the same shape
 * regardless of whether the email exists — this prevents attackers
 * from discovering which emails are registered (user enumeration).
 *
 * In production, the reset token would be sent via email.
 * For development, it's returned in the API response so you
 * can test the full flow without email infrastructure.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  /** The email address associated with the account. */
  @ApiProperty({
    example: 'john@acme.com',
    description: 'Email address of the account to reset',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
