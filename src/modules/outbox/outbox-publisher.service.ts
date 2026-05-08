/**
 * OutboxPublisherService - Drains the outbox table to Kafka.
 *
 * Runs on a 1-second polling interval via @nestjs/schedule.
 * Each tick:
 *   1. SELECT up to 100 PENDING outbox rows (oldest first)
 *      using SELECT ... FOR UPDATE SKIP LOCKED for concurrency safety
 *   2. Publish each to its target Kafka topic
 *   3. On success: mark PUBLISHED, set published_at
 *   4. On failure: increment retry_count, set next_retry_at
 *      with exponential backoff (2^retryCount seconds)
 *   5. After 5 failures: mark FAILED, write to dead_letter_events
 *
 * Why polling over CDC (Change Data Capture)?
 *   - Simpler infrastructure (no Debezium, no connector)
 *   - 1-second latency is acceptable for billing pipelines
 *   - Horizontal scaling via SKIP LOCKED (multiple workers safe)
 *
 * Why SKIP LOCKED?
 *   If two worker instances run simultaneously, they skip rows
 *   already locked by the other. No duplicate publishes.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@app-prisma/prisma.service';

import { KafkaProducerService } from '@modules/kafka';

/** Max outbox rows to process per tick. */
const BATCH_SIZE = 100;

/** Max publish attempts before marking as FAILED. */
const MAX_RETRIES = 5;

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Runs every second. Drains PENDING outbox rows to Kafka.
   *
   * The isProcessing guard prevents overlapping ticks - if a batch
   * takes longer than 1 second, the next tick is skipped.
   */
  @Cron(CronExpression.EVERY_SECOND)
  async drainOutbox(): Promise<void> {
    // Prevent overlapping ticks
    if (this.isProcessing) return;

    // Don't try to publish if Kafka isn't connected
    if (!this.kafkaProducer.getIsConnected()) return;

    this.isProcessing = true;

    try {
      await this.processBatch();
    } catch (error) {
      this.logger.error(
        `Outbox drain failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single batch of outbox rows.
   *
   * Uses raw SQL for SELECT ... FOR UPDATE SKIP LOCKED because
   * Prisma doesn't support SKIP LOCKED natively. This is the
   * standard pattern for concurrent outbox processing.
   */
  private async processBatch(): Promise<void> {
    // Fetch PENDING rows that are ready to process
    // (nextRetryAt is null OR in the past)
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        topic: string;
        aggregate_id: string;
        payload: Record<string, unknown>;
        retry_count: number;
      }>
    >(
      `SELECT id, topic, aggregate_id, payload, retry_count
       FROM outbox_events
       WHERE status = 'PENDING'
         AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      BATCH_SIZE,
    );

    if (rows.length === 0) return;

    for (const row of rows) {
      await this.publishRow(row);
    }

    this.logger.debug(`Outbox: published ${rows.length} events`);
  }

  /**
   * Publish a single outbox row to Kafka.
   *
   * On success: mark PUBLISHED.
   * On failure: increment retry count with exponential backoff.
   * After MAX_RETRIES: mark FAILED + create dead letter record.
   */
  private async publishRow(row: {
    id: string;
    topic: string;
    aggregate_id: string;
    payload: Record<string, unknown>;
    retry_count: number;
  }): Promise<void> {
    try {
      // Publish to Kafka - key = aggregate_id for partition ordering
      await this.kafkaProducer.publish(
        row.topic,
        row.aggregate_id,
        row.payload,
      );

      // Mark as published
      await this.prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const newRetryCount = row.retry_count + 1;

      if (newRetryCount >= MAX_RETRIES) {
        // Exceeded max retries - mark FAILED and write to dead letter
        await this.prisma.$transaction([
          this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: {
              status: 'FAILED',
              retryCount: newRetryCount,
              lastError: errorMessage,
            },
          }),
          this.prisma.deadLetterEvent.create({
            data: {
              sourceEventId: row.aggregate_id,
              tenantId:
                (row.payload as Record<string, string>).tenantId ?? null,
              topic: row.topic,
              failureStage: 'PUBLISHING',
              failureReason: `Outbox publish failed after ${MAX_RETRIES} retries: ${errorMessage}`,
              originalPayload: row.payload as any,
              errorDetails: errorMessage,
              retryCount: newRetryCount,
            },
          }),
        ]);

        this.logger.error(
          `Outbox event ${row.id} moved to dead letter after ${MAX_RETRIES} retries`,
        );
      } else {
        // Exponential backoff: 2^retryCount seconds
        const backoffMs = Math.pow(2, newRetryCount) * 1000;
        const nextRetryAt = new Date(Date.now() + backoffMs);

        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            retryCount: newRetryCount,
            nextRetryAt,
            lastError: errorMessage,
          },
        });

        this.logger.warn(
          `Outbox event ${row.id} failed, retry ${newRetryCount}/${MAX_RETRIES} in ${backoffMs}ms`,
        );
      }
    }
  }
}
