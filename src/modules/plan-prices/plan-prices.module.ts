/**
 * PlanPricesModule - Plan pricing management.
 *
 * Exports PlanPricesService for use by subscriptions module
 * (needs to validate price exists and is active when subscribing).
 */
import { Module } from '@nestjs/common';

import { PlanPricesController } from './plan-prices.controller';
import { PlanPricesService } from './plan-prices.service';

@Module({
  controllers: [PlanPricesController],
  providers: [PlanPricesService],
  exports: [PlanPricesService],
})
export class PlanPricesModule {}
