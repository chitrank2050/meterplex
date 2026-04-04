/**
 * UpdateTenantDto — Validates the request body for tenant updates.
 *
 * All fields are optional — the client sends only what they want to change.
 * This is the "partial update" pattern (PATCH semantics).
 *
 * Note: slug is NOT updatable. Changing a slug would break
 * external integrations, bookmarks, and API key scoping.
 * If a tenant needs a new slug, create a new tenant.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsObject } from 'class-validator';
import { TenantStatus } from '../../../../generated/prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';

export class UpdateTenantDto {
  /** Updated organization name. */
  @ApiPropertyOptional({ example: 'Acme Corp International' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value?.trim?.() : (value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Updated tenant status. */
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: TenantStatus;

  /** Updated metadata (replaces entire metadata object). */
  @ApiPropertyOptional({
    example: { timezone: 'Europe/London' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
