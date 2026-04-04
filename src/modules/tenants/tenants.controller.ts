/**
 * TenantsController — HTTP layer for tenant management.
 *
 * This controller handles ONLY HTTP concerns:
 *   - Route mapping (which URL maps to which method)
 *   - HTTP status codes (201 for creation, 200 for reads)
 *   - Request parsing (path params, query params, body)
 *   - Swagger documentation decorators
 *
 * ALL business logic lives in TenantsService.
 * The controller is thin — it delegates everything to the service.
 *
 * Routes:
 *   POST   /api/v1/tenants          → Create a tenant
 *   GET    /api/v1/tenants          → List tenants (paginated)
 *   GET    /api/v1/tenants/:id      → Get tenant by ID
 *   GET    /api/v1/tenants/slug/:slug → Get tenant by slug
 *   PATCH  /api/v1/tenants/:id      → Update a tenant
 *   DELETE /api/v1/tenants/:id      → Soft-delete (cancel) a tenant
 *
 * Auth: Currently unprotected. JWT guards will be added in Step 5.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';

@ApiTags('Tenants')
@Controller({
  path: 'tenants',
  version: '1',
})
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * POST /api/v1/tenants
   *
   * Creates a new tenant organization.
   * Returns 201 Created with the full tenant object.
   * Returns 409 Conflict if the slug already exists.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  /**
   * GET /api/v1/tenants?page=1&limit=20
   *
   * Lists all tenants with pagination.
   * Defaults to page 1, 20 items per page.
   */
  @Get()
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.tenantsService.findAll(page ?? 1, limit ?? 20);
  }

  /**
   * GET /api/v1/tenants/slug/:slug
   *
   * Finds a tenant by its URL-safe slug.
   * This route is defined BEFORE :id to prevent NestJS
   * from interpreting "slug" as a UUID parameter.
   */
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  @ApiParam({ name: 'slug', example: 'acme-corp' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  /**
   * GET /api/v1/tenants/:id
   *
   * Finds a tenant by UUID.
   * ParseUUIDPipe validates the param is a valid UUID before
   * the method runs — returns 400 if it's not a UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  /**
   * PATCH /api/v1/tenants/:id
   *
   * Updates a tenant. Only sent fields are changed (partial update).
   * Uses PATCH not PUT because we don't require all fields.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto);
  }

  /**
   * DELETE /api/v1/tenants/:id
   *
   * Soft-deletes a tenant by setting status to CANCELLED.
   * Data is preserved for compliance. Tenant can be reactivated.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a tenant (soft delete)' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant cancelled' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.remove(id);
  }
}
