/**
 * EntitlementCheckModule - Runtime entitlement evaluation.
 *
 * Separate from EntitlementsModule intentionally:
 *   - EntitlementsModule = admin CRUD for plan-feature mappings
 *   - EntitlementCheckModule = runtime evaluation (the hot path)
 *
 * Different audiences, different concerns, different access patterns.
 */
import { Module } from '@nestjs/common';

import { EntitlementCheckController } from './entitlement-check.controller';
import { EntitlementCheckService } from './entitlement-check.service';

@Module({
  controllers: [EntitlementCheckController],
  providers: [EntitlementCheckService],
  exports: [EntitlementCheckService],
})
export class EntitlementCheckModule {}
