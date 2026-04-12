/**
 * FeaturesModule - Feature catalog management.
 *
 * Exports FeaturesService for use by other modules
 * (entitlements need to validate feature existence and type).
 */
import { Module } from '@nestjs/common';

import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

@Module({
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
