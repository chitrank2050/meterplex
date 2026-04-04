/**
 * AppModule — Root module of the Meterplex application.
 *
 * Module registration order matters:
 *   1. ConfigModule — FIRST, validates .env, makes ConfigService global
 *   2. PrismaModule — database connection, available globally
 *   3. HealthModule — readiness/liveness checks
 *   4. Feature modules — tenants, billing, usage, etc.
 */
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { ConfigModule } from './config';
import { PrismaModule } from './prisma';
import { HealthModule } from './health';

// module
import { TenantsModule } from '@modules/tenants';
import { UsersModule } from '@modules/users';
import { AuthModule } from '@modules/auth';
import { ApiKeysModule } from '@modules/api-keys';

import { CorrelationIdMiddleware, RequestLoggerMiddleware } from './common';

@Module({
  imports: [
    // ConfigModule MUST be first — it validates .env and makes
    // ConfigService available globally. If env validation fails,
    // the app crashes here before any other module initializes.
    ConfigModule,
    // PrismaModule makes PrismaService available for injection
    // in any service across the entire app without re-importing.
    PrismaModule,
    // HealthModule — readiness/liveness checks
    HealthModule,
    // Feature modules
    TenantsModule,
    UsersModule,
    AuthModule,
    ApiKeysModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  /**
   * configure() is called by NestJS during module initialization.
   * Middleware runs in the order registered, on every matching route.
   *
   * Order matters:
   *   1. CorrelationIdMiddleware — assigns x-correlation-id
   *   2. RequestLoggerMiddleware — logs request with that correlation ID
   *
   * forRoutes('*') applies to every route in the application.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*path');
  }
}
