/**
 * config.module.ts - Centralized Configuration Module
 *
 * Wraps @nestjs/config with our validation layer.
 * Import this module ONCE in AppModule - it's global,
 * meaning ConfigService is available in every module
 * without re-importing.
 *
 * Usage in any service:
 *   constructor(private config: ConfigService) {}
 *   const port = this.config.get<number>('PORT');
 */
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      // Makes ConfigService available in every module without re-importing.
      isGlobal: true,

      // Our custom validation function. Crashes app if config is invalid.
      validate,

      // Path to .env file. In production, real env vars override these.
      envFilePath: '.env',
    }),
  ],
})
export class ConfigModule {}
