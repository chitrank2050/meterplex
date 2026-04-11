/**
 * @CurrentUser() - Extracts the authenticated user from the request.
 *
 * Without this decorator, every controller method needs:
 *   @Request() req: { user: { id: string; email: string; ... } }
 *   const userId = req.user.id;
 *
 * With this decorator:
 *   @CurrentUser() user: AuthenticatedUser
 *   const userId = user.id;
 *
 * You can also extract a single property:
 *   @CurrentUser('id') userId: string
 *   @CurrentUser('email') email: string
 *
 * How it works:
 *   1. JwtAuthGuard runs the Passport JWT strategy
 *   2. JwtStrategy.validate() looks up the user in the DB
 *   3. Passport attaches the user to request.user
 *   4. This decorator reads request.user and returns it (or a property)
 *
 * This only works on routes protected by JwtAuthGuard.
 * On unprotected routes, request.user is undefined.
 */
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown> | undefined;

    // If a specific property was requested, return just that property.
    // @CurrentUser('id') → returns user.id
    // @CurrentUser() → returns the full user object
    return data ? user?.[data] : user;
  },
);
