/**
 * UsageAggregationConsumer - Reads usage.validated, updates usage_aggregates.
 *
 * For each validated event:
 *   1. Determine the period key from the event timestamp + feature reset period
 *   2. Upsert the usage_aggregates row:
 *      INSERT ... ON CONFLICT DO UPDATE SET amount = amount + EXCLUDED.amount
 *   3. Update Redis cache with atomic INCRBY (sub-millisecond read path)
 *   4. Mark the usage_event as AGGREGATED
 *
 * The upsert is atomic - Postgres guarantees no lost increments
 * even under concurrent writes from multiple consumers.
 *
 * Why not batch? Each event might target a different aggregate row
 * (different tenant, feature, period). Batching with individual
 * upserts gives the same number of DB operations. True batching
 * would require GROUP BY in the consumer, which adds complexity
 * without meaningful gain at this scale.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { RedisService } from '@infra/cache';
import {
  KAFKA_CONSUMER_GROUPS,
  KAFKA_TOPICS,
  KafkaConsumerBase,
  KafkaProducerService,
} from '@infra/messaging';

/** Shape of a validated usage event from the validation consumer. */
interface ValidatedUsageEvent {
  id: string;
  eventId: string;
  tenantId: string;
  validatedSubscriptionId: string;
  feature: string;
  featureType: string;
  amount: number;
  timestamp: string;
  validatedAt: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class UsageAggregationConsumer extends KafkaConsumerBase {
  protected readonly topic = KAFKA_TOPICS.USAGE_VALIDATED;
  protected readonly groupId = KAFKA_CONSUMER_GROUPS.USAGE_AGGREGATOR;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  /**
   * Process a single validated usage event.
   * Atomically increments the aggregate counter for this tenant + feature + period.
   */
  async handleMessage(payload: unknown, key: string): Promise<void> {
    const event = payload as ValidatedUsageEvent;

    // key is the Kafka message key (aggregate ID), used for trace logging
    this.logger.debug(`Processing message key=${key}`);

    try {
      // Determine period key and boundaries from the event timestamp
      const eventDate = new Date(event.timestamp);
      const { periodKey, periodStart, periodEnd } = this.calculatePeriod(
        eventDate,
        event.featureType,
      );

      // Atomic upsert: INSERT or INCREMENT
      // Prisma doesn't support ON CONFLICT DO UPDATE with increment,
      // so we use raw SQL for atomicity.
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO usage_aggregates (
          id, tenant_id, subscription_id, feature_lookup_key,
          period_key, amount, period_start, period_end,
          last_event_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3,
          $4, $5, $6, $7,
          $8, NOW(), NOW()
        )
        ON CONFLICT (tenant_id, feature_lookup_key, period_key, subscription_id)
        DO UPDATE SET
          amount = usage_aggregates.amount + EXCLUDED.amount,
          last_event_at = EXCLUDED.last_event_at,
          updated_at = NOW()`,
        event.tenantId,
        event.validatedSubscriptionId,
        event.feature,
        periodKey,
        event.amount,
        periodStart,
        periodEnd,
        eventDate,
      );

      // Update Redis cache - atomic increment mirrors the Postgres upsert.
      // EntitlementCheckService reads from Redis for sub-millisecond response.
      // If Redis is down, Postgres is the fallback.
      try {
        const cacheKey = this.buildCacheKey(
          event.tenantId,
          event.feature,
          periodKey,
        );
        await this.redis.incrBy(cacheKey, event.amount);
        await this.redis.expire(cacheKey, this.calculateTtl(periodEnd));
      } catch (redisError) {
        // Redis failure is non-critical - Postgres has the data.
        // Log and continue. Step 9's read path falls back to Postgres on cache miss.
        this.logger.warn(
          `Redis cache update failed: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
        );
      }

      // Mark the usage event as aggregated
      await this.prisma.usageEvent.update({
        where: { id: event.id },
        data: { status: 'AGGREGATED' },
      });

      this.logger.debug(
        `Aggregated: ${event.feature} +${event.amount} for tenant ${event.tenantId} (period: ${periodKey})`,
      );
    } catch (error) {
      // Send to dead letter on aggregation failure
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.kafkaProducer.publish(
        KAFKA_TOPICS.USAGE_DEAD_LETTER,
        event.tenantId,
        {
          sourceEventId: event.eventId,
          tenantId: event.tenantId,
          feature: event.feature,
          failureStage: 'AGGREGATION',
          failureReason: `Aggregation failed: ${errorMessage}`,
          originalPayload: event,
          failedAt: new Date().toISOString(),
        },
      );

      this.logger.error(
        `Aggregation failed for ${event.eventId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Calculate the period key and boundaries from an event timestamp.
   *
   * For QUOTA features with MONTHLY reset:
   *   timestamp: 2026-04-16T10:30:00Z
   *   periodKey: "2026-04"
   *   periodStart: 2026-04-01T00:00:00Z
   *   periodEnd: 2026-05-01T00:00:00Z
   *
   * We default to MONTHLY if the feature type doesn't have a specific
   * reset period, because the entitlement snapshot's reset period
   * isn't included in the validated event payload. The aggregation
   * layer groups by period regardless - the entitlement check service
   * queries by period key to get the right counter.
   *
   * TODO: Include resetPeriod in the validated event payload for
   *       accurate ANNUALLY and NEVER period calculations.
   */
  private calculatePeriod(
    eventDate: Date,
    resetPeriod: string,
  ): {
    periodKey: string;
    periodStart: Date;
    periodEnd: Date;
  } {
    // Default to monthly periods for all feature types.
    // ANNUALLY and NEVER periods will be handled when resetPeriod
    // is included in the validated event payload.
    const year = eventDate.getUTCFullYear();
    const month = eventDate.getUTCMonth();

    switch (resetPeriod) {
      case 'ANNUALLY':
        return {
          periodKey: `${year}`,
          periodStart: new Date(Date.UTC(year, 0, 1)),
          periodEnd: new Date(Date.UTC(year + 1, 0, 1)),
        };

      case 'NEVER':
        return {
          periodKey: 'lifetime',
          periodStart: new Date(Date.UTC(2020, 0, 1)),
          periodEnd: new Date(Date.UTC(2099, 11, 31)),
        };

      case 'MONTHLY':
      default:
        return {
          periodKey: `${year}-${String(month + 1).padStart(2, '0')}`,
          periodStart: new Date(Date.UTC(year, month, 1)),
          periodEnd: new Date(Date.UTC(year, month + 1, 1)),
        };
    }
  }

  /**
   * Build the Redis cache key for a usage aggregate.
   * Format: usage:{tenantId}:{featureLookupKey}:{periodKey}
   *
   * Same format used by EntitlementCheckService to read.
   */
  private buildCacheKey(
    tenantId: string,
    feature: string,
    periodKey: string,
  ): string {
    return `usage:${tenantId}:${feature}:${periodKey}`;
  }

  /**
   * Calculate TTL in seconds until the period ends.
   * Ensures cache keys auto-expire when the billing period resets.
   */
  private calculateTtl(periodEnd: Date): number {
    const remaining = Math.floor((periodEnd.getTime() - Date.now()) / 1000);
    // Minimum 60s, maximum 35 days (covers monthly + buffer)
    return Math.max(60, Math.min(remaining, 35 * 24 * 60 * 60));
  }
}
