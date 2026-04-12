/**
 * PlansModule - Billing plan management.
 *
 * Exports PlansService for use by other modules
 * (subscriptions will need to look up plans).
 */
import { Module } from '@nestjs/common';

import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
