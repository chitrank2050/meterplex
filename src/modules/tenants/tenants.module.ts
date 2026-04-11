/**
 * TenantsModule - Encapsulates all tenant-related functionality.
 *
 * Registers the controller and service. PrismaService is available
 * globally (from PrismaModule), so no need to import it here.
 */
import { Module } from '@nestjs/common';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
