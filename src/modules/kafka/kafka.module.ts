/**
 * KafkaModule - Kafka producer and consumer infrastructure.
 *
 * Provides:
 *   - KafkaProducerService: singleton producer for publishing messages
 *   - KafkaConsumerBase: abstract class for building consumers (not a provider)
 *
 * Global: true - any module can inject KafkaProducerService
 * without importing KafkaModule explicitly. Same pattern as PrismaModule.
 */
import { Global, Module } from '@nestjs/common';

import { KafkaProducerService } from './kafka-producer.service';

@Global()
@Module({
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
