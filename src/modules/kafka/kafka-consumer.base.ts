/**
 * KafkaConsumerBase - Abstract base class for Kafka consumers.
 *
 * Handles:
 *   - Connection lifecycle (connect on init, disconnect on shutdown)
 *   - Topic subscription
 *   - Message deserialization (JSON parse)
 *   - Per-message error handling (log + continue, don't crash the consumer)
 *   - Graceful shutdown (finish current message, then disconnect)
 *
 * Subclasses implement handleMessage() with their business logic.
 * If handleMessage() throws, the error is logged and the consumer
 * moves to the next message (at-least-once semantics with auto-commit).
 *
 * Usage:
 *   @Injectable()
 *   export class UsageValidationConsumer extends KafkaConsumerBase {
 *     protected topic = KAFKA_TOPICS.USAGE_RAW;
 *     protected groupId = KAFKA_CONSUMER_GROUPS.USAGE_VALIDATOR;
 *
 *     async handleMessage(payload: unknown, key: string): Promise<void> {
 *       // validate, enrich, publish to usage.validated
 *     }
 *   }
 */
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';

import { KAFKA_BROKER, KAFKA_CLIENT_ID } from './kafka.constants';

export abstract class KafkaConsumerBase
  implements OnModuleInit, OnModuleDestroy
{
  protected abstract readonly topic: string;
  protected abstract readonly groupId: string;
  protected readonly logger: Logger;

  private readonly kafka: Kafka;
  private consumer!: Consumer;
  private isRunning = false;

  constructor() {
    this.logger = new Logger(this.constructor.name);
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
    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
    });

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.processMessage(payload);
        },
      });

      this.isRunning = true;
      this.logger.log(
        `Consumer started: topic=${this.topic}, group=${this.groupId}`,
      );
    } catch (error) {
      this.logger.error(
        `Consumer failed to start: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isRunning) {
      await this.consumer.disconnect();
      this.logger.log(`Consumer disconnected: group=${this.groupId}`);
    }
  }

  /**
   * Process a single Kafka message.
   * Deserializes JSON, calls handleMessage(), catches errors.
   * Errors are logged but don't crash the consumer.
   */
  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const key = message.key?.toString() ?? 'unknown';
    const rawValue = message.value?.toString();

    if (!rawValue) {
      this.logger.warn(
        `Empty message: topic=${topic}, partition=${partition}, offset=${message.offset}`,
      );
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      this.logger.error(
        `Invalid JSON: topic=${topic}, partition=${partition}, offset=${message.offset}`,
      );
      return;
    }

    try {
      await this.handleMessage(parsedValue, key);
    } catch (error) {
      this.logger.error(
        `Message processing failed: topic=${topic}, partition=${partition}, offset=${message.offset}, error=${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't rethrow - consumer continues to next message.
      // Failed message handling is the subclass's responsibility
      // (e.g., publish to dead letter topic).
    }
  }

  /**
   * Handle a single deserialized message.
   * Implement in subclasses with business logic.
   *
   * @param payload - Parsed JSON message value
   * @param key - Message key (typically tenantId)
   */
  protected abstract handleMessage(
    payload: unknown,
    key: string,
  ): Promise<void>;
}
