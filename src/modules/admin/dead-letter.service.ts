/**
 * DeadLetterService - Query and manage dead letter events.
 *
 * Dead letter events are usage pipeline failures that need
 * manual triage: investigate, retry, or discard.
 *
 * Retry re-publishes the originalPayload to the event's topic.
 * The pipeline reprocesses from scratch. If it fails again,
 * it lands back in dead letter with incremented retryCount.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { KafkaProducerService } from '@infra/messaging';

import { DeadLetterStage, DeadLetterStatus } from '@prisma/client';

export interface DeadLetterFilters {
  status?: DeadLetterStatus;
  failureStage?: DeadLetterStage;
  tenantId?: string;
}

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * List dead letter events with filters and pagination.
   */
  async findAll(filters: DeadLetterFilters, page = 1, limit = 50) {
    const pageNum = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.failureStage) where.failureStage = filters.failureStage;
    if (filters.tenantId) where.tenantId = filters.tenantId;

    const [events, total] = await Promise.all([
      this.prisma.deadLetterEvent.findMany({
        where,
        orderBy: { firstFailedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.deadLetterEvent.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single dead letter event by ID.
   */
  async findById(id: string) {
    const event = await this.prisma.deadLetterEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Dead letter event not found');
    }

    return event;
  }

  /**
   * Retry a dead letter event by re-publishing to its original topic.
   * Sets status to RETRYING, increments retryCount.
   */
  async retry(id: string, adminId: string) {
    const event = await this.findById(id);

    if (event.status === DeadLetterStatus.RESOLVED) {
      throw new NotFoundException('Event already resolved - nothing to retry');
    }

    if (event.status === DeadLetterStatus.DISCARDED) {
      throw new NotFoundException('Event was discarded - cannot retry');
    }

    // Re-publish to original topic
    const messageKey = event.tenantId ?? event.sourceEventId ?? event.id;
    await this.kafkaProducer.publish(
      event.topic,
      messageKey,
      event.originalPayload as unknown as Record<string, unknown>,
    );

    // Update status
    const updated = await this.prisma.deadLetterEvent.update({
      where: { id },
      data: {
        status: DeadLetterStatus.RETRYING,
        retryCount: { increment: 1 },
        lastAttemptedAt: new Date(),
        resolvedBy: adminId,
      },
    });

    this.logger.log(
      `Dead letter ${id} retried → topic ${event.topic} (attempt #${updated.retryCount})`,
    );

    return updated;
  }

  /**
   * Discard a dead letter event - admin decided it's not worth retrying.
   */
  async discard(id: string, adminId: string) {
    const event = await this.findById(id);

    if (event.status === DeadLetterStatus.RESOLVED) {
      throw new NotFoundException('Event already resolved');
    }

    const updated = await this.prisma.deadLetterEvent.update({
      where: { id },
      data: {
        status: DeadLetterStatus.DISCARDED,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      },
    });

    this.logger.log(`Dead letter ${id} discarded by admin ${adminId}`);

    return updated;
  }
}
