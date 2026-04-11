/**
 * AuthModule - Wires up JWT authentication with Passport.
 *
 * Dependencies:
 *   - UsersModule: user lookup during login and registration
 *   - PassportModule: integrates Passport strategies with NestJS guards
 *   - JwtModule: signs access tokens (refresh tokens use the service directly)
 *
 * The JwtStrategy is registered as a provider so Passport
 * discovers it when JwtAuthGuard activates on a protected route.
 *
 * JwtModule.registerAsync ensures ConfigModule has loaded and validated
 * the JWT_SECRET before we try to read it.
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '@modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // UsersModule exports UsersService - needed for login validation
    UsersModule,

    // Register 'jwt' as the default Passport strategy
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
            '15m',
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
