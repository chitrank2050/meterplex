/**
 * @Roles() - Metadata decorator that specifies which roles can access a route.
 *
 * Usage:
 *   @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   async deleteUser() { ... }
 *
 * This decorator does NOT enforce anything by itself.
 * It attaches metadata to the route handler. The RolesGuard
 * reads this metadata and checks the user's role.
 *
 * Guard order matters:
 *   1. JwtAuthGuard runs first → authenticates the user
 *   2. RolesGuard runs second → checks the user's role in the tenant
 *   If JwtAuthGuard fails, RolesGuard never runs.
 */
import { SetMetadata } from '@nestjs/common';

import { MembershipRole } from '@prisma/client';

/**
 * Key used to store and retrieve roles metadata.
 * Must match the key used in RolesGuard's Reflector.get() call.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator that sets the required roles on a route handler.
 *
 * @param roles - One or more MembershipRole values that are allowed
 * @returns MethodDecorator that attaches roles metadata
 *
 * @example
 *   // Only OWNER and ADMIN can access this route
 *   @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
 */
export const Roles = (...roles: MembershipRole[]) =>
  SetMetadata(ROLES_KEY, roles);
