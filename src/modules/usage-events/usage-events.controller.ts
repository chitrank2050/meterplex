/**
 * UsageEventsController - Batch ingestion endpoint for usage events.
 *
 * Single endpoint following the Stripe Meter Events / AWS PutMetricData pattern:
 *   POST /api/v1/usage/events
 *
 * Auth: API key only. Usage events are server-to-server - they come from
 * the tenant's infrastructure, not from dashboard users. JWT doesn't map
 * to any real client use case here.
 *
 * Tenant context: derived from the API key's tenant binding. No x-tenant-id
 * header needed - the key IS the tenant.
 *
 * Response: 202 Accepted with per-event status. Async processing happens
 * downstream via the outbox → Kafka pipeline.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { ErrorResponseDto } from '@common/dto';

import { ApiKeyAuthGuard } from '@modules/api-keys/guards/api-key-auth.guard';

import { CreateUsageEventsDto, UsageEventsResponseDto } from './dto';
import { UsageEventsService } from './usage-events.service';

interface ApiKeyRequest extends Request {
  tenantId?: string;
  apiKeyId?: string;
}

@ApiTags('Usage Events')
@Controller({
  path: 'usage/events',
  version: '1',
})
export class UsageEventsController {
  constructor(private readonly usageEventsService: UsageEventsService) {}

  /**
   * POST /api/v1/usage/events
   *
   * Submit a batch of usage events for processing.
   * Returns immediately with per-event status.
   *
   * Per-event statuses:
   *   accepted  - queued for processing (new event)
   *   duplicate - eventId already exists, idempotent no-op
   *   rejected  - validation failed, reason provided
   */
  @Post()
  @UseGuards(ApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'Authorization',
    description: 'API key: Bearer mp_live_...',
    required: true,
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit a batch of usage events' })
  @ApiResponse({
    status: 202,
    description: 'Batch processed with per-event status',
    type: UsageEventsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing API key',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No active subscription for this tenant',
    type: ErrorResponseDto,
  })
  async ingest(
    @Req() req: ApiKeyRequest,
    @Body() dto: CreateUsageEventsDto,
  ): Promise<UsageEventsResponseDto> {
    // tenantId is set by ApiKeyAuthGuard from the API key
    const tenantId = req.tenantId!;
    return this.usageEventsService.ingest(tenantId, dto);
  }
}
