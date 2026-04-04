/**
 * AuthModule — Wires up JWT authentication with Passport.
 *
 * Imports:
 *   - UsersModule: needed to look up users during login
 *   - JwtModule: signs and verifies JWT tokens
 *   - PassportModule: integrates Passport strategies with NestJS
 *
 * The JwtStrategy is registered as a provider so Passport
 * can find it when JwtAuthGuard activates.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    UsersModule,

    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule.registerAsync reads config at runtime, not import time.
    // This ensures ConfigModule has loaded before we read JWT_SECRET.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRATION',
            '1h',
          ) as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
