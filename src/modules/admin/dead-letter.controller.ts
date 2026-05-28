/**
 * DeadLetterController - Admin API for dead letter event management.
 *
 * Dead letter events are pipeline failures that need manual triage.
 * This controller provides investigation, retry, and discard operations.
 *
 * Routes:
 *   GET  /api/v1/admin/dead-letter           → List with filters
 *   GET  /api/v1/admin/dead-letter/:id       → Get full event details
 *   POST /api/v1/admin/dead-letter/:id/retry   → Re-queue to Kafka
 *   POST /api/v1/admin/dead-letter/:id/discard → Mark as discarded
 *
 * Authorization:
 *   Protected by PlatformAdminGuard - only isPlatformAdmin users.
 *
 * Retry flow:
 *   Admin investigates → fixes underlying issue → clicks retry →
 *   originalPayload re-published to Kafka topic → pipeline reprocesses →
 *   success: event aggregated normally
 *   failure: back in dead letter with incremented retryCount
 */
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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

import { CurrentUser } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { PlatformAdminGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { DeadLetterService } from './dead-letter.service';
import { DeadLetterListResponseDto, DeadLetterResponseDto } from './dto';

@ApiTags('Admin - Dead Letter')
@Controller({
  path: 'admin/dead-letter',
  version: '1',
})
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class DeadLetterController {
  constructor(private readonly deadLetterService: DeadLetterService) {}

  /**
   * GET /api/v1/admin/dead-letter
   *
   * List dead letter events with optional filters.
   * Newest failures first. Filterable by status, failure stage, and tenant.
   *
   * Typical dashboard view:
   *   ?status=FAILED              → events needing attention
   *   ?failureStage=VALIDATION    → validation-specific failures
   *   ?tenantId=uuid              → failures for a specific tenant
   */
  @Get()
  @ApiOperation({ summary: 'List dead letter events (platform admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['FAILED', 'RETRYING', 'RESOLVED', 'DISCARDED'],
  })
  @ApiQuery({
    name: 'failureStage',
    required: false,
    enum: ['INGESTION', 'PUBLISHING', 'VALIDATION', 'AGGREGATION', 'UNKNOWN'],
  })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Paginated dead letter events',
    type: DeadLetterListResponseDto,
  })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('failureStage') failureStage?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.deadLetterService.findAll(
      {
        status: status as any,
        failureStage: failureStage as any,
        tenantId,
      },
      page ?? 1,
      limit ?? 50,
    );
  }

  /**
   * GET /api/v1/admin/dead-letter/:id
   *
   * Get full details for a single dead letter event.
   * Includes originalPayload, errorDetails, and retry history.
   * This is the investigation view before deciding retry vs discard.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get dead letter event details' })
  @ApiParam({ name: 'id', description: 'Dead letter event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Dead letter event with full payload',
    type: DeadLetterResponseDto,
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.deadLetterService.findById(id);
  }

  /**
   * POST /api/v1/admin/dead-letter/:id/retry
   *
   * Re-publish the event's originalPayload to its original Kafka topic.
   * The pipeline reprocesses from scratch (validation → aggregation).
   *
   * Prerequisites: fix the underlying issue first (missing tenant,
   * invalid feature, etc.). Retrying without fixing will fail again.
   *
   * Status transitions: FAILED → RETRYING, or RETRYING → RETRYING
   * (with incremented retryCount).
   */
  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a dead letter event' })
  @ApiParam({ name: 'id', description: 'Dead letter event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Event re-queued to Kafka',
    type: DeadLetterResponseDto,
  })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.deadLetterService.retry(id, adminId);
  }

  /**
   * POST /api/v1/admin/dead-letter/:id/discard
   *
   * Mark a dead letter event as discarded. Terminal state - cannot
   * be retried after. Use when the event is test data, a known
   * duplicate, or the underlying issue is not fixable.
   *
   * Records which admin discarded it for audit trail.
   */
  @Post(':id/discard')
  @ApiOperation({ summary: 'Discard a dead letter event' })
  @ApiParam({ name: 'id', description: 'Dead letter event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Event discarded',
    type: DeadLetterResponseDto,
  })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async discard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.deadLetterService.discard(id, adminId);
  }
}
