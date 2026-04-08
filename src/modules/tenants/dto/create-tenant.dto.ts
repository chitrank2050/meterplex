/**
 * CreateTenantDto - Validates the request body for tenant creation.
 *
 * class-validator decorators define what the client MUST send.
 * The global ValidationPipe (configured in main.ts) runs these
 * checks automatically before the controller method executes.
 *
 * If validation fails, the client gets a 400 with specific errors:
 *   { "message": ["name must be shorter than or equal to 255 characters"] }
 *
 * The controller never sees invalid data.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
  IsObject,
} from 'class-validator';

import { Transform, TransformFnParams } from 'class-transformer';

export class CreateTenantDto {
  /** Human-readable organization name. */
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Organization display name',
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * URL-safe identifier. Used in API paths: /api/v1/tenants/acme-corp
   *
   * Rules:
   *   - Lowercase letters, numbers, and hyphens only
   *   - Must start with a letter
   *   - 3-100 characters
   *   - Must be unique across all tenants
   *
   * The regex prevents slugs like "--invalid" or "123start".
   */
  @ApiProperty({
    example: 'acme-corp',
    description:
      'URL-safe unique identifier (lowercase, hyphens, starts with letter)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message:
      'slug must start with a letter and contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  /** Optional metadata bag for tenant-specific settings. */
  @ApiPropertyOptional({
    example: { timezone: 'America/New_York', billingEmail: 'billing@acme.com' },
    description: 'Arbitrary key-value metadata stored as JSONB',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
