/**
 * RegisterDto — Validates the registration request body.
 *
 * Registration creates THREE things in one transaction:
 *   1. A new user account
 *   2. A new tenant organization
 *   3. A membership linking the user as OWNER of that tenant
 *
 * This is the "sign up" flow — a new customer onboarding.
 * Adding users to an EXISTING tenant is a separate operation
 * handled by the memberships module.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsObject,
} from 'class-validator';

export class RegisterDto {
  // --- User fields ---

  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  // --- Tenant fields ---

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tenantName!: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message:
      'tenantSlug must start with a letter and contain only lowercase letters, numbers, and hyphens',
  })
  tenantSlug!: string;

  @ApiProperty({ required: false, example: { timezone: 'America/New_York' } })
  @IsOptional()
  @IsObject()
  tenantMetadata?: Record<string, any>;
}
