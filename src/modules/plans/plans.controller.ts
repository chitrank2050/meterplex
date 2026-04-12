/**
 * PlansController - HTTP layer for billing plan management.
 *
 * Plans define the product identity (e.g., "Pro", "Enterprise") and are
 * global entities. They are not scoped to a specific tenant.
 *
 * Routes:
 *   POST   /api/v1/plans           → Create a new plan (OWNER/ADMIN only)
 *   GET    /api/v1/plans           → List all plans (Public/Pricing page)
 *   GET    /api/v1/plans/:id       → Get plan by ID
 *   GET    /api/v1/plans/slug/:slug → Get plan by slug
 *   PATCH  /api/v1/plans/:id       → Update plan details (OWNER/ADMIN only)
 *
 * Authorization:
 *   - Creating and updating plans requires authentication (JWT).
 *   - Reading plans is public (no authentication required for basic listing).
 *   - TODO: Implement PlatformAdminGuard to restrict modification to platform owners.
 *
 * Response strategy:
 *   The service layer handles field filtering via Prisma select.
 *   Plans include active prices by default (no separate fetch needed).
 *   Response DTOs exist purely for Swagger documentation.
 */
// TODO: Implement PlatformAdminGuard to restrict modification to platform owners.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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

import { ErrorResponseDto } from '@common/dto';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import {
  CreatePlanDto,
  PlanListResponseDto,
  PlanResponseDto,
  UpdatePlanDto,
} from './dto';
import { PlansService } from './plans.service';

@ApiTags('Plans')
@Controller({
  path: 'plans',
  version: '1',
})
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * POST /api/v1/plans
   *
   * Creates a new billing plan. Plans define the product identity.
   *
   * Authorization:
   *   - Currently allows any authenticated user.
   *   - TODO: Add PlatformAdminGuard to restrict to system owners.
   *
   * Protected: requires JWT authentication.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new billing plan (Authenticated Users)' })
  @ApiResponse({
    status: 201,
    description: 'Plan created',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Slug already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission',
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  /**
   * GET /api/v1/plans
   *
   * Lists all plans. By default, it skips ARCHIVED plans.
   * This is the endpoint for the public pricing page.
   *
   * Public: no authentication required.
   */
  @Get()
  @ApiOperation({ summary: 'List all plans' })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    example: false,
    description: 'Include ARCHIVED plans in the results',
  })
  @ApiResponse({
    status: 200,
    description: 'List of plans found',
    type: PlanListResponseDto,
  })
  async findAll(@Query('includeArchived') includeArchived?: boolean) {
    return this.plansService.findAll(includeArchived ?? false);
  }

  /**
   * GET /api/v1/plans/slug/:slug
   *
   * Look up a plan by its URL-safe slug (e.g., 'pro', 'enterprise').
   *
   * Public: no authentication required.
   */
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get plan by slug' })
  @ApiParam({ name: 'slug', example: 'pro' })
  @ApiResponse({
    status: 200,
    description: 'Plan details',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
    type: ErrorResponseDto,
  })
  async findBySlug(@Param('slug') slug: string) {
    return this.plansService.findBySlug(slug);
  }

  /**
   * GET /api/v1/plans/:id
   *
   * Returns a plan's details by its unique UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({
    status: 200,
    description: 'Plan found',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
    type: ErrorResponseDto,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.findById(id);
  }

  /**
   * PATCH /api/v1/plans/:id
   *
   * Updates a plan's details. The slug is immutable.
   *
   * Authorization:
   *   - Currently allows any authenticated user.
   *   - TODO: Add PlatformAdminGuard to restrict to system owners.
   *
   * Protected: requires JWT authentication.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a plan (Authenticated Users)' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({
    status: 200,
    description: 'Plan updated',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, dto);
  }
}
