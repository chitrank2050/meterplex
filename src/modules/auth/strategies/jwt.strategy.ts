/**
 * JwtStrategy - Passport strategy that validates JWT tokens.
 *
 * How it works:
 *   1. Client sends request with header: Authorization: Bearer <token>
 *   2. Passport extracts the token from the header
 *   3. Passport verifies the signature using JWT_SECRET
 *   4. If valid, Passport calls validate() with the decoded payload
 *   5. validate() returns the user object → attached to request.user
 *   6. If invalid/expired, Passport throws 401 Unauthorized
 *
 * The strategy is registered as 'jwt' and used by JwtAuthGuard.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '@prisma/prisma.service';

import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Configuration passed to passport-jwt
    super({
      // Extract token from Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Reject expired tokens automatically
      ignoreExpiration: false,

      // The secret used to verify the token's signature
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called by Passport AFTER the token is verified.
   * The payload is the decoded JWT data we signed during login.
   *
   * We look up the user in the database to ensure:
   *   - The user still exists (wasn't deleted after token was issued)
   *   - The account is still active (wasn't disabled)
   *
   * The returned object is attached to request.user and available
   * in every controller method via @Request() or custom decorators.
   *
   * @param payload - Decoded JWT payload (sub, email, iat, exp)
   * @returns User object for request.user
   * @throws UnauthorizedException if user not found or inactive
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or disabled');
    }

    return user;
  }
}
