/**
 * AppModule — Root module of the Meterplex application.
 *
 * This is the entry point for NestJS's dependency injection container.
 * Every feature module (tenants, billing, usage) will be imported here.
 *
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}