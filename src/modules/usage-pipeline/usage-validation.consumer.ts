/**
 * UsageValidationConsumer - Reads usage.raw, validates, publishes to usage.validated.
 *
 * Validation checks (re-validated at consumption time because state can change):
 *   1. Event has required fields (id, tenantId, feature, amount, timestamp)
 *   2. Tenant exists and has an active subscription
 *   3. Feature is in the subscription's entitlement snapshots
 *   4. Event is not a duplicate (event_id already processed)
 *
 * On success: publishes enriched event to usage.validated
 * On failure: publishes to usage.dead-letter with failure reason
 *
 * Why re-validate if we already validated at ingestion?
 *   - Tenant's subscription could have been cancelled between ingestion and processing
 *   - Feature could have been removed from the plan
 *   - Ingestion validation is optimistic (fast path), this is the authoritative check
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import {
  KAFKA_CONSUMER_GROUPS,
  KAFKA_TOPICS,
  KafkaConsumerBase,
  KafkaProducerService,
} from '@modules/kafka';

import { SubscriptionStatus } from '@prisma/client';

/** Shape of a raw usage event from the outbox. */
interface RawUsageEvent {
  id: string;
  eventId: string;
  tenantId: string;
  subscriptionId: string;
  feature: string;
  amount: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/** Shape of a validated usage event published downstream. */
interface ValidatedUsageEvent extends RawUsageEvent {
  /** The subscription that was active at validation time. */
  validatedSubscriptionId: string;
  /** Feature type from the entitlement snapshot. */
  featureType: string;
  /** Reset period from the entitlement snapshot. */
  resetPeriod: string;
  /** When validation occurred. */
  validatedAt: string;
}

@Injectable()
export class UsageValidationConsumer extends KafkaConsumerBase {
  protected readonly topic = KAFKA_TOPICS.USAGE_RAW;
  protected readonly groupId = KAFKA_CONSUMER_GROUPS.USAGE_VALIDATOR;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    super();
  }

  /**
   * Process a single raw usage event.
   *
   * @param payload - Parsed JSON from usage.raw
   * @param key - Message key (aggregate ID, typically usage event UUID)
   */
  async handleMessage(payload: unknown, key: string): Promise<void> {
    const event = payload as RawUsageEvent;

    // key is the Kafka message key (aggregate ID), used for trace logging
    this.logger.debug(`Processing message key=${key}`);

    // Validate required fields
    if (!event.id || !event.tenantId || !event.feature || !event.amount) {
      await this.sendToDeadLetter(
        event,
        'Missing required fields (id, tenantId, feature, amount)',
      );
      await this.updateEventStatus(
        event.id,
        'REJECTED',
        'Missing required fields',
      );
      return;
    }

    // Check for duplicate processing (event already validated or aggregated)
    const existingEvent = await this.prisma.usageEvent.findUnique({
      where: { eventId: event.eventId },
      select: { status: true },
    });

    if (existingEvent && existingEvent.status !== 'PENDING') {
      // Already processed - publish to duplicates topic for monitoring
      await this.kafkaProducer.publish(
        KAFKA_TOPICS.USAGE_DUPLICATES,
        event.tenantId,
        { eventId: event.eventId, status: existingEvent.status },
      );
      return;
    }

    // Validate tenant has an active subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: event.tenantId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      select: {
        id: true,
        entitlementSnapshots: {
          where: { featureLookupKey: event.feature },
          select: {
            featureLookupKey: true,
            featureType: true,
            resetPeriod: true,
          },
        },
      },
    });

    if (!subscription) {
      await this.sendToDeadLetter(
        event,
        `No active subscription for tenant ${event.tenantId}`,
      );
      await this.updateEventStatus(
        event.id,
        'REJECTED',
        'No active subscription',
      );
      return;
    }

    // Validate feature is in the subscription's entitlements
    const snapshot = subscription.entitlementSnapshots[0];
    if (!snapshot) {
      await this.sendToDeadLetter(
        event,
        `Feature "${event.feature}" not in subscription's entitlements`,
      );
      await this.updateEventStatus(
        event.id,
        'REJECTED',
        `Feature "${event.feature}" not entitled`,
      );
      return;
    }

    // All checks passed - publish validated event
    const validatedEvent: ValidatedUsageEvent = {
      ...event,
      validatedSubscriptionId: subscription.id,
      featureType: snapshot.featureType,
      resetPeriod: snapshot.resetPeriod ?? 'MONTHLY',
      validatedAt: new Date().toISOString(),
    };

    await this.kafkaProducer.publish(
      KAFKA_TOPICS.USAGE_VALIDATED,
      event.tenantId,
      validatedEvent as unknown as Record<string, unknown>,
    );

    // Update event status in database
    await this.updateEventStatus(event.id, 'VALIDATED');

    this.logger.debug(
      `Validated: ${event.eventId} (${event.feature} × ${event.amount}) for tenant ${event.tenantId}`,
    );
  }

  /**
   * Update the usage event's pipeline status in the database.
   */
  private async updateEventStatus(
    id: string,
    status: 'VALIDATED' | 'REJECTED' | 'DUPLICATE',
    rejectionReason?: string,
  ): Promise<void> {
    try {
      await this.prisma.usageEvent.update({
        where: { id },
        data: {
          status,
          ...(rejectionReason && { rejectionReason }),
        },
      });
    } catch (error) {
      // Non-critical: event was already processed or deleted
      this.logger.warn(
        `Failed to update event status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send a failed event to the dead letter topic.
   */
  private async sendToDeadLetter(
    event: RawUsageEvent,
    reason: string,
  ): Promise<void> {
    try {
      await this.kafkaProducer.publish(
        KAFKA_TOPICS.USAGE_DEAD_LETTER,
        event.tenantId ?? 'unknown',
        {
          sourceEventId: event.eventId,
          tenantId: event.tenantId,
          feature: event.feature,
          failureStage: 'VALIDATION',
          failureReason: reason,
          originalPayload: event,
          failedAt: new Date().toISOString(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish to dead letter: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.warn(`Event rejected: ${event.eventId} - ${reason}`);
  }
}
