/**
 * ReconciliationController - Admin API for billing reconciliation.
 *
 * Provides visibility into pipeline integrity: are raw usage events
 * matching their aggregated totals? If not, which tenants and features
 * have discrepancies?
 *
 * Routes:
 *   GET  /api/v1/admin/reconciliation/runs            → List runs
 *   GET  /api/v1/admin/reconciliation/runs/:id/issues → Issues for a run
 *   POST /api/v1/admin/reconciliation/run             → Trigger manual run
 *
 * Authorization:
 *   Protected by PlatformAdminGuard - only isPlatformAdmin users.
 *
 * Typical workflow:
 *   1. Dashboard shows "last reconciliation: 0 issues" (healthy)
 *   2. One day: "last reconciliation: 2 issues" (investigate)
 *   3. Admin clicks into the run → sees Acme/api_calls off by 3
 *   4. Admin checks dead letter → finds 3 stuck events
 *   5. Admin fixes and retries → runs manual reconciliation
 *   6. "0 issues" - billing integrity restored
 */
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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

import {
  ReconciliationIssueListResponseDto,
  ReconciliationIssueResponseDto,
  ReconciliationRunListResponseDto,
  ReconciliationRunResponseDto,
} from './dto';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Admin - Reconciliation')
@Controller({
  path: 'admin/reconciliation',
  version: '1',
})
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * GET /api/v1/admin/reconciliation/runs
   *
   * List all reconciliation runs, newest first.
   * Each run shows: when it ran, how long it took,
   * how many combinations were checked, and how many issues found.
   */
  @Get('runs')
  @ApiOperation({ summary: 'List reconciliation runs' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated reconciliation runs',
    type: ReconciliationRunListResponseDto,
  })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findAllRuns(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reconciliationService.findAllRuns(page ?? 1, limit ?? 20);
  }

  /**
   * GET /api/v1/admin/reconciliation/runs/:id/issues
   *
   * List all mismatches found during a specific run.
   * Each issue shows: tenant, feature, period, expected vs actual,
   * and the calculated difference (positive = under-billed,
   * negative = over-billed).
   */
  @Get('runs/:id/issues')
  @ApiOperation({ summary: 'Get issues for a reconciliation run' })
  @ApiParam({ name: 'id', description: 'Reconciliation run UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['usage', 'subscription_payment'],
    description: 'Filter by issue category',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated reconciliation issues',
    type: ReconciliationIssueListResponseDto,
  })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findIssuesByRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ) {
    return this.reconciliationService.findIssuesByRun(
      id,
      page ?? 1,
      limit ?? 50,
      category,
    );
  }

  /**
   * POST /api/v1/admin/reconciliation/run
   *
   * Trigger a manual reconciliation run. Same logic as the daily cron
   * but on-demand. Useful after fixing dead letter events, running
   * data migrations, or investigating billing discrepancies.
   *
   * Returns the completed run synchronously (blocks until done).
   * For large datasets, consider making this async in the future.
   */
  @Post('run')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger manual reconciliation run' })
  @ApiResponse({
    status: 201,
    description: 'Reconciliation run completed',
    type: ReconciliationRunResponseDto,
  })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async triggerRun(@CurrentUser('id') adminId: string) {
    return this.reconciliationService.triggerManual(adminId);
  }

  /**
   * GET /api/v1/admin/reconciliation/issues/:id
   *
   * Get a single reconciliation issue with full details.
   */
  @Get('issues/:id')
  @ApiOperation({ summary: 'Get reconciliation issue details' })
  @ApiParam({ name: 'id', description: 'Reconciliation issue UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation issue',
    type: ReconciliationIssueResponseDto,
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async findIssueById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.findIssueById(id);
  }

  /**
   * POST /api/v1/admin/reconciliation/issues/:id/acknowledge
   *
   * Mark an issue as acknowledged - admin is investigating.
   * Optionally attach notes about the investigation.
   */
  @Post('issues/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a reconciliation issue' })
  @ApiParam({ name: 'id', description: 'Reconciliation issue UUID' })
  @ApiQuery({ name: 'notes', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Issue acknowledged',
    type: ReconciliationIssueResponseDto,
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async acknowledgeIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('notes') notes?: string,
  ) {
    return this.reconciliationService.acknowledgeIssue(id, notes);
  }

  /**
   * POST /api/v1/admin/reconciliation/issues/:id/resolve
   *
   * Mark an issue as resolved - mismatch explained or corrected.
   * Include notes explaining the resolution for audit trail.
   */
  @Post('issues/:id/resolve')
  @ApiOperation({ summary: 'Resolve a reconciliation issue' })
  @ApiParam({ name: 'id', description: 'Reconciliation issue UUID' })
  @ApiQuery({ name: 'notes', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Issue resolved',
    type: ReconciliationIssueResponseDto,
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async resolveIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('notes') notes?: string,
  ) {
    return this.reconciliationService.resolveIssue(id, notes);
  }
}
