/**
 * SubscriptionsModule - Tenant subscription management.
 *
 * Exports SubscriptionsService for use by the entitlement
 * check service (needs to find the active subscription
 * and its snapshots).
 */
import { Module } from '@nestjs/common';

import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
