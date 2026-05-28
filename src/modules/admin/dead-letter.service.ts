/**
 * DeadLetterService - Query and manage dead letter events.
 *
 * Dead letter events are usage pipeline failures that need manual
 * triage. Every event that fails validation or aggregation lands
 * here with the original payload preserved for investigation.
 *
 * Three operations:
 *   - List/view: investigate what failed and why
 *   - Retry: re-publish the originalPayload to its Kafka topic.
 *     The pipeline reprocesses from scratch (validation → aggregation).
 *     If it fails again, retryCount increments and it's back here.
 *   - Discard: admin decides the event is not worth retrying
 *     (e.g., test data, known bad payload). Marks as DISCARDED
 *     with the admin's UUID for audit trail.
 *
 * Lifecycle: FAILED → RETRYING → RESOLVED (or back to FAILED)
 *                   → DISCARDED (terminal)
 *
 * Why manual retry instead of auto-retry:
 *   Dead letter events failed validation - auto-retrying the same
 *   bad data loops forever. The admin must investigate first:
 *   fix the data, fix the validation rule, or discard.
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants';

import { KafkaProducerService } from '@infra/messaging';

import { DeadLetterStage, DeadLetterStatus } from '@prisma/client';

/**
 * Filter options for dead letter event queries.
 * All fields are optional - omitted fields are not filtered.
 */
export interface DeadLetterFilters {
  /** Filter by lifecycle status. */
  status?: DeadLetterStatus;
  /** Filter by which pipeline stage failed. */
  failureStage?: DeadLetterStage;
  /** Scope to a specific tenant's failures. */
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
   *
   * Results ordered by firstFailedAt (newest failures first).
   * The admin dashboard typically shows FAILED events first,
   * then RETRYING, with RESOLVED/DISCARDED in a separate view.
   *
   * @param filters - Optional filter criteria
   * @param page - Page number (1-based)
   * @param limit - Results per page (max 100)
   * @returns Paginated dead letter events with metadata
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
   *
   * Returns the full event including originalPayload and errorDetails.
   * This is the investigation view - the admin reads the payload,
   * checks the failure reason, and decides: retry or discard.
   *
   * @param id - Dead letter event UUID
   * @returns The dead letter event with full details
   * @throws NotFoundException if event doesn't exist
   */
  async findById(id: string) {
    const event = await this.prisma.deadLetterEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(ERRORS.DEAD_LETTER.NOT_FOUND);
    }

    return event;
  }

  /**
   * Retry a dead letter event by re-publishing to its original Kafka topic.
   *
   * Flow:
   *   1. Validate the event can be retried (not RESOLVED or DISCARDED)
   *   2. Re-publish originalPayload to the event's topic
   *   3. Update status → RETRYING, increment retryCount
   *   4. Record which admin triggered the retry
   *
   * The pipeline reprocesses from scratch. If validation passes this
   * time (e.g., the underlying data issue was fixed), the event
   * flows through to aggregation and the dead letter status eventually
   * becomes RESOLVED. If it fails again, retryCount increments.
   *
   * @param id - Dead letter event UUID
   * @param adminId - UUID of the admin triggering the retry
   * @returns The updated dead letter event
   * @throws NotFoundException if event doesn't exist
   * @throws BadRequestException if event is already resolved or discarded
   */
  async retry(id: string, adminId: string) {
    const event = await this.findById(id);

    if (event.status === DeadLetterStatus.RESOLVED) {
      throw new BadRequestException(ERRORS.DEAD_LETTER.ALREADY_RESOLVED);
    }

    if (event.status === DeadLetterStatus.DISCARDED) {
      throw new BadRequestException(ERRORS.DEAD_LETTER.ALREADY_DISCARDED);
    }

    // Re-publish to original topic. The message key determines
    // Kafka partition (tenant-level ordering).
    const messageKey = event.tenantId ?? event.sourceEventId ?? event.id;
    await this.kafkaProducer.publish(
      event.topic,
      messageKey,
      event.originalPayload as unknown as Record<string, unknown>,
    );

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
      `Dead letter ${id} retried → topic ${event.topic} (attempt #${updated.retryCount}) by admin ${adminId}`,
    );

    return updated;
  }

  /**
   * Discard a dead letter event.
   *
   * The admin has investigated and decided this event is not worth
   * retrying (test data, known bad payload, duplicate, etc.).
   * Marks as DISCARDED - a terminal state. Cannot be retried after.
   *
   * @param id - Dead letter event UUID
   * @param adminId - UUID of the admin discarding the event
   * @returns The updated dead letter event
   * @throws NotFoundException if event doesn't exist
   * @throws BadRequestException if event is already resolved
   */
  async discard(id: string, adminId: string) {
    const event = await this.findById(id);

    if (event.status === DeadLetterStatus.RESOLVED) {
      throw new BadRequestException(ERRORS.DEAD_LETTER.ALREADY_RESOLVED);
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
