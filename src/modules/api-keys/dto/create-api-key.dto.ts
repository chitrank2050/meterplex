/**
 * CreateApiKeyDto - Validates the request body for API key creation.
 *
 * The client provides a human-readable name and optional expiration.
 * The server generates the actual key - clients never choose their own keys.
 *
 * Example request:
 *   {
 *     "name": "Production backend",
 *     "expiresInDays": 90
 *   }
 *
 * Example response (shown ONCE, never again):
 *   {
 *     "id": "uuid",
 *     "name": "Production backend",
 *     "key": "mp_live_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345",
 *     "keyPrefix": "mp_live_aB",
 *     "expiresAt": "2026-07-04T..."
 *   }
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateApiKeyDto {
  /**
   * Human-readable label to identify this key.
   * Examples: "Production backend", "CI/CD pipeline", "Staging"
   */
  @ApiProperty({
    example: 'Production backend',
    description: 'Human-readable name to identify this key',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * Optional: number of days until the key expires.
   * Null or omitted = no expiration.
   * Range: 1-365 days. For longer-lived keys, rotate instead.
   *
   * Why limit to 365? Keys without expiration become forgotten
   * security liabilities. Annual rotation is a minimum best practice.
   */
  @ApiPropertyOptional({
    example: 90,
    description: 'Days until expiration (null = no expiration)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
