/**
 * CreateUserDto — Validates the request body for user registration.
 *
 * This DTO is used when an OWNER creates a user directly via the API.
 * The auth/register endpoint (coming in Step 4) will use a separate
 * RegisterDto that also includes tenant creation.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  /** User's login email. Must be globally unique. */
  @ApiProperty({ example: 'john@abc.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /**
   * Plain text password. Will be bcrypt-hashed before storage.
   *
   * Requirements:
   *   - 8-72 characters (72 is bcrypt's max input length)
   *   - At least one uppercase letter
   *   - At least one lowercase letter
   *   - At least one number
   *
   * These rules balance security with usability. Overly strict
   * rules (special characters required) lead to password reuse.
   */
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
}
