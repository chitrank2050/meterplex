/**
 * KafkaProducerService - Publishes messages to Kafka topics.
 *
 * Wraps kafkajs producer with:
 *   - Connection lifecycle (connect on module init, disconnect on shutdown)
 *   - Typed publish method with topic, key, and value
 *   - Error handling and logging
 *   - Batch publish for high-throughput scenarios
 *
 * The producer is singleton (one instance per app process) and
 * connection-pooled internally by kafkajs.
 *
 * Message key strategy:
 *   - Usage events: keyed by tenantId for per-tenant ordering
 *   - The key determines the Kafka partition → all events for
 *     the same tenant land on the same partition → ordered processing
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { Kafka, Partitioners, Producer } from 'kafkajs';

import { KAFKA_BROKER, KAFKA_CLIENT_ID } from './kafka.constants';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly kafka: Kafka;
  private producer!: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: [KAFKA_BROKER],
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      allowAutoTopicCreation: true,
    });

    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error(
        `Kafka producer connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't crash the app - outbox publisher will retry
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Publish a single message to a Kafka topic.
   *
   * @param topic - Kafka topic name
   * @param key - Message key (used for partition assignment)
   * @param value - Message payload (will be JSON-stringified)
   * @throws Error if producer is not connected or publish fails
   */
  async publish(
    topic: string,
    key: string,
    value: Record<string, unknown>,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected');
    }

    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  /**
   * Publish multiple messages to a Kafka topic in a single batch.
   * More efficient than individual publishes for bulk operations.
   *
   * @param topic - Kafka topic name
   * @param messages - Array of { key, value } pairs
   */
  async publishBatch(
    topic: string,
    messages: Array<{ key: string; value: Record<string, unknown> }>,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected');
    }

    if (messages.length === 0) return;

    await this.producer.send({
      topic,
      messages: messages.map((m) => ({
        key: m.key,
        value: JSON.stringify(m.value),
        timestamp: Date.now().toString(),
      })),
    });
  }

  /**
   * Check if the producer is connected and ready to publish.
   * Used by the health check and outbox publisher.
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}
