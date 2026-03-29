/**
 * AppModule — Root module of the Meterplex application.
 *
 * Module registration order matters:
 *   1. ConfigModule — FIRST, validates .env, makes ConfigService global
 *   2. PrismaModule — database connection, available globally
 *   3. HealthModule — readiness/liveness checks
 *   4. Feature modules — tenants, billing, usage, etc.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';

import { HealthModule } from './health';

@Module({
  imports: [
    // ConfigModule MUST be first — it validates .env and makes
    // ConfigService available globally. If env validation fails,
    // the app crashes here before any other module initializes.
    ConfigModule,
    // PrismaModule makes PrismaService available for injection
    // in any service across the entire app without re-importing.
    PrismaModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
