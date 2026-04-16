/**
 * EntitlementsModule - Plan-feature mapping management.
 *
 * Exports EntitlementsService for use by subscriptions module
 * (needs to read entitlements when creating snapshots).
 */
import { Module } from '@nestjs/common';

import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';

@Module({
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
