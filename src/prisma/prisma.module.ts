/**
 * PrismaModule - Makes PrismaService available for injection.
 *
 * Global module - import ONCE in AppModule, then inject PrismaService
 * in any service across the entire app without re-importing.
 *
 * Why global? Every feature module (tenants, billing, usage) needs
 * database access. Importing PrismaModule in each one is boilerplate.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
