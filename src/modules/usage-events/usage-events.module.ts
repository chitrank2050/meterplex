/**
 * UsageEventsModule - Usage event ingestion API.
 *
 * Exports UsageEventsService for future modules that need to
 * ingest events programmatically (e.g., seed scripts, reconciliation).
 *
 * Imports ApiKeysModule for the ApiKeyAuthGuard (which needs
 * ApiKeysService via dependency injection).
 */
import { Module } from '@nestjs/common';

import { ApiKeysModule } from '@modules/api-keys';

import { UsageEventsController } from './usage-events.controller';
import { UsageEventsService } from './usage-events.service';

@Module({
  imports: [ApiKeysModule],
  controllers: [UsageEventsController],
  providers: [UsageEventsService],
  exports: [UsageEventsService],
})
export class UsageEventsModule {}
