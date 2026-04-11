/**
 * ApiKeyAuthGuard - Authenticates requests using API keys.
 *
 * This guard is an ALTERNATIVE to JwtAuthGuard - not used alongside it.
 * A request is authenticated by either:
 *   - JWT token (dashboard/admin users) → JwtAuthGuard
 *   - API key (server-to-server) → ApiKeyAuthGuard
 *
 * How it works:
 *   1. Extracts the key from Authorization: Bearer mp_live_...
 *   2. Calls ApiKeysService.authenticate() to validate
 *   3. If valid, sets request.tenantId and request.apiKeyId
 *   4. If invalid, throws 401
 *
 * API key requests are always tenant-scoped - the key IS the
 * tenant context. No x-tenant-id header needed.
 *
 * Usage:
 *   @UseGuards(ApiKeyAuthGuard)
 *   async ingestUsageEvent() { ... }
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';

import { ApiKeysService } from '../api-keys.service';

interface CustomRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
  tenantId?: string;
  apiKeyId?: string;
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomRequest>();

    // Extract the key from the Authorization header
    const authHeader = request.headers['authorization'] as string;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    // Support both "Bearer mp_live_..." and raw "mp_live_..."
    const key = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Validate: must start with our prefix to be an API key
    if (!key.startsWith('mp_live_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Authenticate the key - throws 401 if invalid
    const { tenantId, keyId } = await this.apiKeysService.authenticate(key);

    // Attach tenant context to the request.
    // Downstream controllers use @TenantId() to read this.
    // No x-tenant-id header needed - the key IS the tenant context.
    request.tenantId = tenantId;
    request.headers['x-tenant-id'] = tenantId;
    request.apiKeyId = keyId;

    return true;
  }
}
