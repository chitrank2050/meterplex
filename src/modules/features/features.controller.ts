/**
 * FeaturesController - CRUD for the feature catalog.
 *
 * Features are platform-wide - not tenant-scoped.
 * Any authenticated user can view features.
 * Only authenticated users can create or modify features.
 *
 * Routes:
 *   POST   /api/v1/features              → Create a feature
 *   GET    /api/v1/features              → List all features
 *   GET    /api/v1/features/:id          → Get feature by ID
 *   GET    /api/v1/features/key/:lookupKey → Get feature by lookup key
 *   PATCH  /api/v1/features/:id          → Update feature
 *
 * Response strategy:
 *   The service layer handles field filtering via Prisma select.
 *   Response DTOs exist purely for Swagger documentation.
 */
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
  CreateFeatureDto,
  FeatureListResponseDto,
  FeatureResponseDto,
  UpdateFeatureDto,
} from './dto';
import { FeaturesService } from './features.service';

@ApiTags('Features')
@Controller({
  path: 'features',
  version: '1',
})
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  /**
   * POST /api/v1/features
   *
   * Creates a new feature in the global catalog.
   * The lookup_key and type are immutable after creation.
   *
   * Protected: requires JWT authentication.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({
    status: 201,
    description: 'Feature created',
    type: FeatureResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Lookup key already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }

  /**
   * GET /api/v1/features
   *
   * Lists all features in the catalog.
   * Pass ?includeArchived=true to see retired features.
   *
   * Public: no authentication required.
   */
  @Get()
  @ApiOperation({ summary: 'List all features' })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    example: false,
    description: 'Include ARCHIVED features in response',
  })
  @ApiResponse({
    status: 200,
    description: 'List of features',
    type: FeatureListResponseDto,
  })
  async findAll(@Query('includeArchived') includeArchived?: boolean) {
    return this.featuresService.findAll(includeArchived ?? false);
  }

  /**
   * GET /api/v1/features/key/:lookupKey
   *
   * Look up a feature by its programmatic lookup key.
   * Must be defined BEFORE /:id to avoid NestJS
   * interpreting "key" as a UUID parameter.
   *
   * Public: no authentication required.
   */
  @Get('key/:lookupKey')
  @ApiOperation({ summary: 'Get feature by lookup key' })
  @ApiParam({ name: 'lookupKey', example: 'api_calls' })
  @ApiResponse({
    status: 200,
    description: 'Feature details',
    type: FeatureResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feature not found',
    type: ErrorResponseDto,
  })
  async findByLookupKey(@Param('lookupKey') lookupKey: string) {
    return this.featuresService.findByLookupKey(lookupKey);
  }

  /**
   * GET /api/v1/features/:id
   *
   * Get a feature by UUID.
   *
   * Public: no authentication required.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiParam({ name: 'id', description: 'Feature UUID' })
  @ApiResponse({
    status: 200,
    description: 'Feature details',
    type: FeatureResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feature not found',
    type: ErrorResponseDto,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.featuresService.findById(id);
  }

  /**
   * PATCH /api/v1/features/:id
   *
   * Update a feature. lookup_key and type are NOT updatable.
   *
   * Protected: requires JWT authentication.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a feature (lookup_key and type are immutable)',
  })
  @ApiParam({ name: 'id', description: 'Feature UUID' })
  @ApiResponse({
    status: 200,
    description: 'Feature updated',
    type: FeatureResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feature not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featuresService.update(id, dto);
  }
}
