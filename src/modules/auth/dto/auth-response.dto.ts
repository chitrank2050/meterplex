/**
 * Response DTOs for auth endpoints.
 *
 * Defines the exact token + user shape returned by register,
 * login, refresh, and change-password endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AuthUserDto {
  @ApiProperty({ example: 'b1ccfb75-6d33-4be4-9556-6f3ac55456a1' })
  id!: string;

  @ApiProperty({ example: 'alice@meterplex.dev' })
  email!: string;

  @ApiProperty({ example: 'Alice' })
  firstName!: string;

  @ApiProperty({ example: 'Johnson' })
  lastName!: string;
}

class AuthTenantDto {
  @ApiProperty({ example: '0eed08b2-60b6-4578-ae98-a98f3b164c54' })
  id!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  slug!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthTenantDto })
  tenant!: AuthTenantDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class TokenPairResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example:
      'If an account exists with this email, a reset token has been generated',
  })
  message!: string;

  @ApiPropertyOptional({
    example: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345678901234',
    description:
      'Reset token (returned in dev only, sent via email in production)',
    nullable: true,
  })
  resetToken!: string | null;
}

export class MessageResponseDto {
  @ApiProperty({
    example: 'Password has been reset. Please log in with your new password.',
  })
  message!: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({
    example:
      'Password changed successfully. All other sessions have been logged out.',
  })
  message!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;
}

export class MeResponseDto {
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
}
