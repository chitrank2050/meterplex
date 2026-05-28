/**
 * AuditLogsService - Query audit logs with filters and pagination.
 *
 * Platform admin only. Provides cross-tenant visibility into
 * all mutations recorded by the AuditLogInterceptor.
 *
 * Supported filters:
 *   - tenantId: scope to a specific tenant's activity
 *   - actorId: filter by who performed the action (user or API key UUID)
 *   - actorType: filter by authentication method (USER, API_KEY, SYSTEM)
 *   - resource: filter by resource type (tenant, invoice, subscription, etc.)
 *   - action: filter by mutation type (CREATE, UPDATE, DELETE)
 *   - startDate/endDate: date range for time-bounded queries
 *
 * Use cases:
 *   - Support: "show me everything that happened to Acme Corp last week"
 *   - Compliance: "who modified billing data in May?"
 *   - Forensics: "what did this API key do before it was revoked?"
 *
 * No mutations - audit logs are immutable. This service is read-only.
 */
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants';
import { isNotFoundError } from '@common/utils/prisma-errors';

import { AuditAction, AuditActorType } from '@prisma/client';

/**
 * Filter options for audit log queries.
 * All fields are optional - omitted fields are not filtered.
 */
export interface AuditLogFilters {
  /** Scope to a specific tenant's activity. */
  tenantId?: string;
  /** Filter by who performed the action. */
  actorId?: string;
  /** Filter by authentication method. */
  actorType?: AuditActorType;
  /** Filter by resource type (tenant, invoice, subscription, etc.). */
  resource?: string;
  /** Filter by mutation type (CREATE, UPDATE, DELETE). */
  action?: AuditAction;
  /** Start of date range (inclusive). ISO 8601 string. */
  startDate?: string;
  /** End of date range (inclusive). ISO 8601 string. */
  endDate?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List audit logs with filters and pagination.
   *
   * Results are ordered newest-first. All filters are AND-combined.
   * An empty filter set returns all audit logs.
   *
   * @param filters - Optional filter criteria
   * @param page - Page number (1-based)
   * @param limit - Results per page (max 100)
   * @returns Paginated audit log entries with metadata
   */
  async findAll(filters: AuditLogFilters, page = 1, limit = 50) {
    const pageNum = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      };
    }

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: entries,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single audit log entry by ID.
   *
   * Returns the full entry including the changes JSONB payload.
   * Useful for investigating a specific mutation in detail.
   *
   * @param id - Audit log UUID
   * @returns The audit log entry
   * @throws NotFoundException if entry doesn't exist
   */
  async findById(id: string) {
    try {
      return await this.prisma.auditLog.findUnique({
        where: { id },
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.AUDIT.NOT_FOUND);
      }
      throw error;
    }
  }
}
