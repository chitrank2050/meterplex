/**
 * LoginDto — Validates the login request body.
 *
 * The client sends email + plain text password.
 * The auth service validates against the bcrypt hash.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
