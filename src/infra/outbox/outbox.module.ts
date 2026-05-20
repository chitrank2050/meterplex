/**
 * OutboxModule - Outbox publisher worker.
 *
 * The publisher runs as a scheduled task (@Cron every second).
 * Requires @nestjs/schedule to be registered in AppModule.
 */
import { Module } from '@nestjs/common';

import { OutboxPublisherService } from './outbox-publisher.service';

@Module({
  providers: [OutboxPublisherService],
  exports: [OutboxPublisherService],
})
export class OutboxModule {}
