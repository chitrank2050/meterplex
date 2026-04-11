/**
 * RolesGuard - Enforces role-based access control (RBAC).
 *
 * How it works:
 *   1. The @Roles() decorator sets required roles on the route handler
 *   2. JwtAuthGuard runs first and authenticates the user
 *   3. This guard reads the required roles from metadata
 *   4. It reads the tenant ID from the x-tenant-id header
 *   5. It looks up the user's membership in that tenant
 *   6. If the user's role is in the required list → access granted
 *   7. If not → 403 Forbidden
 *
 * If no @Roles() decorator is present, the guard allows access
 * (the route is role-agnostic - any authenticated user can access it).
 *
 * This guard MUST be used AFTER JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * Without JwtAuthGuard, request.user is undefined and the guard
 * can't identify who the user is.
 */
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request } from 'express';

import { ROLES_KEY } from '@common/decorators/roles.decorator';

import { PrismaService } from '@prisma/prisma.service';

import { Membership, MembershipRole } from '@generated/prisma/client';

interface CustomRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
  membership?: Membership;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: Read the required roles from the @Roles() decorator.
    // If no @Roles() decorator exists, requiredRoles is undefined
    // and we allow access (no role restriction on this route).
    const requiredRoles = this.reflector.get<MembershipRole[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Step 2: Get the authenticated user from the request.
    // JwtAuthGuard must have run before this guard.
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required before role check');
    }

    // Step 3: Get the tenant ID from the request header.
    // Every tenant-scoped request must include x-tenant-id.
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new BadRequestException(
        'x-tenant-id header is required for this operation',
      );
    }

    // Check if TenantGuard already fetched and attached the membership
    let membership = request.membership;

    // ONLY query the DB if membership isn't already on the request
    if (!membership) {
      // Step 4: Look up the user's membership in this tenant.
      // This is a DB query on every request - cached in Redis in Phase 5.
      membership =
        (await this.prisma.membership.findUnique({
          where: {
            userId_tenantId: {
              userId: user.id,
              tenantId,
            },
          },
        })) ?? undefined;
    }

    // Step 5: Check if the user has one of the required roles.
    if (!membership) {
      throw new ForbiddenException('You are not a member of this tenant');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Step 6: Attach the membership to the request for downstream use.
    // Controllers can access request.membership to know the user's role
    // without making another DB query.
    request.membership = membership;

    return true;
  }
}
