/**
 * RefreshTokenDto - Validates the token refresh request body.
 *
 * The frontend stores the refresh token securely (httpOnly cookie
 * or encrypted storage) and sends it ONLY to this endpoint.
 * It is NOT sent on regular API requests - only when the
 * access token expires and needs to be renewed.
 *
 * Flow:
 *   1. Access token expires → backend returns 401
 *   2. Frontend catches 401 → calls POST /auth/refresh
 *   3. Backend validates refresh token → returns new token pair
 *   4. Frontend retries the original request with the new access token
 */
import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  /**
   * The raw refresh token JWT received from login or register.
   * Signed with a separate secret from the access token.
   */
  @ApiProperty({
    example: 'eyJhbGciOiJIUz...',
    description: 'Refresh token JWT from login or previous refresh',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
