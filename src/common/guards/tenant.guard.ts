/**
 * TenantGuard - Ensures the request has a valid x-tenant-id header
 * and the authenticated user is a member of that tenant.
 *
 * This is the ROW-LEVEL TENANT ISOLATION guard. It guarantees:
 *   - Every tenant-scoped request specifies which tenant it's for
 *   - The user actually belongs to that tenant
 *   - Tenant A's user cannot access Tenant B's resources
 *
 * Use this guard on any endpoint that operates on tenant-scoped data.
 * It runs AFTER JwtAuthGuard (needs the user) and BEFORE the controller.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, TenantGuard)
 *   async listUsageEvents(@TenantId() tenantId: string) { ... }
 *
 * This guard does NOT check roles - it only checks membership.
 * For role checks, add RolesGuard after TenantGuard:
 *   @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Request } from 'express';
import { Membership } from '@generated/prisma/client';

interface CustomRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
  tenantId?: string;
  membership?: Membership;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract tenant ID from the request header
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    // Validate UUID format (basic check - prevents DB errors)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }

    // Check the user's membership in this tenant
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    // Attach tenant ID and membership to the request.
    // Downstream code can use these without additional DB queries.
    request.tenantId = tenantId;
    request.membership = membership;

    return true;
  }
}
