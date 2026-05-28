/**
 * AuditLogsController - Admin API for querying audit logs.
 *
 * Provides cross-tenant visibility into all mutations. Every POST,
 * PATCH, PUT, and DELETE recorded by the AuditLogInterceptor is
 * queryable here with full filter support.
 *
 * Routes:
 *   GET /api/v1/admin/audit-logs     → List with filters and pagination
 *   GET /api/v1/admin/audit-logs/:id → Get single entry with full changes
 *
 * Authorization:
 *   Protected by PlatformAdminGuard - only isPlatformAdmin users.
 *   Regular tenant users cannot access this endpoint.
 *
 * Response strategy:
 *   Audit log entries are returned as-is from Postgres.
 *   The changes JSONB payload is pre-sanitized by the interceptor
 *   at write time - no additional filtering needed at read time.
 */
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/dto';
import { PlatformAdminGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { AuditLogsService } from './audit-logs.service';
import { AuditLogListResponseDto, AuditLogResponseDto } from './dto';

@ApiTags('Admin - Audit Logs')
@Controller({
  path: 'admin/audit-logs',
  version: '1',
})
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * GET /api/v1/admin/audit-logs
   *
   * List audit logs with optional filters. All filters are AND-combined.
   * Results ordered newest-first. Paginated with standard meta block.
   *
   * Example queries:
   *   ?tenantId=uuid                      → all activity for a tenant
   *   ?resource=invoice&action=CREATE      → all invoice creations
   *   ?actorId=uuid&startDate=2026-05-01  → all actions by user since May
   */
  @Get()
  @ApiOperation({ summary: 'List audit logs (platform admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({
    name: 'actorType',
    required: false,
    enum: ['USER', 'API_KEY', 'SYSTEM'],
  })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2026-05-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2026-05-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit log entries',
    type: AuditLogListResponseDto,
  })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('tenantId') tenantId?: string,
    @Query('actorId') actorId?: string,
    @Query('actorType') actorType?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogsService.findAll(
      {
        tenantId,
        actorId,
        actorType: actorType as any,
        resource,
        action: action as any,
        startDate,
        endDate,
      },
      page ?? 1,
      limit ?? 50,
    );
  }

  /**
   * GET /api/v1/admin/audit-logs/:id
   *
   * Get a single audit log entry with the full changes payload.
   * Use this when investigating a specific mutation flagged
   * in the list view or referenced by a support ticket.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log entry (platform admin only)' })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Audit log entry with full changes',
    type: AuditLogResponseDto,
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogsService.findById(id);
  }
}
