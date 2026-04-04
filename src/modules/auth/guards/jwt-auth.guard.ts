/**
 * JwtAuthGuard — Protects routes that require authentication.
 *
 * Usage on a controller or method:
 *   @UseGuards(JwtAuthGuard)
 *
 * How it works:
 *   1. Guard activates before the route handler
 *   2. Calls Passport's 'jwt' strategy
 *   3. Strategy extracts token from Authorization header
 *   4. Strategy verifies token and calls validate()
 *   5. If valid → request.user is set, route handler executes
 *   6. If invalid → 401 Unauthorized response
 *
 * We extend AuthGuard('jwt') to customize the error response.
 * The default Passport error is generic — we make it clear.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Override to customize the error when authentication fails.
   * Default Passport behavior returns a bare 401.
   * We add a clear message for the API consumer.
   */
  handleRequest<T>(err: Error | null, user: T, info: Error | null): T {
    if (err || !user) {
      throw new UnauthorizedException(
        info?.message === 'jwt expired'
          ? 'Token has expired'
          : 'Authentication required',
      );
    }
    return user;
  }
}
