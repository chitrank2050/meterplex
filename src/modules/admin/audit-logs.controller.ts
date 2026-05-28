/**
 * AuditLogsController - Admin API for querying audit logs.
 *
 * Routes:
 *   GET /api/v1/admin/audit-logs     → List with filters and pagination
 *   GET /api/v1/admin/audit-logs/:id → Get single entry with full changes
 *
 * Protected by PlatformAdminGuard - only isPlatformAdmin users.
 */
import {
  Controller,
  Get,
  NotFoundException,
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

import { ERRORS } from '@common/constants';
import { ErrorResponseDto } from '@common/dto';
import { PlatformAdminGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { AuditLogsService } from './audit-logs.service';

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
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
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
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log entry (platform admin only)' })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  @ApiResponse({ status: 200, description: 'Audit log entry' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.auditLogsService.findById(id);

    if (!entry) {
      throw new NotFoundException(ERRORS.AUDIT.NOT_FOUND);
    }

    return entry;
  }
}
