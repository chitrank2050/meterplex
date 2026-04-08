/**
 * @TenantId() - Extracts the tenant ID from the request header.
 *
 * Multi-tenant APIs need to know WHICH tenant the request is for.
 * The frontend sends this in the x-tenant-id header on every request.
 *
 * Why a header and not a URL parameter?
 *   - URL params would require /api/v1/tenants/:tenantId/users/:userId
 *     which makes every URL longer and couples routing to tenant context.
 *   - A header keeps routes clean: /api/v1/users/:userId
 *     with x-tenant-id: <uuid> in the header.
 *   - This is how Stripe does it with their Connected Accounts
 *     (Stripe-Account header).
 *
 * Usage:
 *   @TenantId() tenantId: string
 *
 * Throws 400 if the header is missing (enforced by TenantGuard).
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['x-tenant-id'] as string;
  },
);
