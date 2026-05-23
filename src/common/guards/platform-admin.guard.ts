/**
 * PlatformAdminGuard - Restricts access to platform-level admin operations.
 *
 * Checks request.user.isPlatformAdmin (set by JwtStrategy).
 * Use on global catalog mutations: plans, features, entitlements, prices.
 *
 * Must run AFTER JwtAuthGuard (needs the user on the request).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, PlatformAdminGuard)
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { ERRORS } from '@common/constants';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException(ERRORS.AUTH.PLATFORM_ADMIN_REQUIRED);
    }

    return true;
  }
}
