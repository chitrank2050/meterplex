/**
 * ApiKeysController - CRUD for API key management.
 *
 * These endpoints are for MANAGING keys (create, list, revoke).
 * They are protected by JWT + TenantGuard + RolesGuard because
 * only authenticated dashboard users (OWNER/ADMIN) should manage keys.
 *
 * The keys THEMSELVES are used by a different guard (ApiKeyAuthGuard)
 * on endpoints like usage ingestion - not here.
 *
 * Response strategy:
 *   The service layer handles field filtering via Prisma select.
 *   Sensitive fields (keyHash) never enter application memory.
 *   Response DTOs exist purely for Swagger documentation.
 *
 * Routes:
 *   POST   /api/v1/api-keys       → Create a new key (OWNER/ADMIN)
 *   GET    /api/v1/api-keys       → List keys for tenant (OWNER/ADMIN)
 *   DELETE /api/v1/api-keys/:id   → Revoke a key (OWNER/ADMIN)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, Roles, TenantId } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { RolesGuard, TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { MembershipRole } from '@generated/prisma/client';

import { ApiKeysService } from './api-keys.service';
import {
  ApiKeyListResponseDto,
  ApiKeyRevokedResponseDto,
  CreateApiKeyDto,
  CreateApiKeyResponseDto,
} from './dto';

@ApiTags('API Keys')
@Controller({
  path: 'api-keys',
  version: '1',
})
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * POST /api/v1/api-keys
   *
   * Creates a new API key for the tenant.
   * The raw key is returned ONCE in the response - store it securely.
   * After this, only the prefix and metadata are visible.
   *
   * Only OWNER and ADMIN can create API keys.
   *
   * Guard chain: JwtAuthGuard → TenantGuard → RolesGuard(OWNER, ADMIN)
   */
  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key (shown once)' })
  @ApiResponse({
    status: 201,
    description: 'Key created - raw key in response',
    type: CreateApiKeyResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async create(
    @Body() dto: CreateApiKeyDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.apiKeysService.create(dto, tenantId, userId);
  }

  /**
   * GET /api/v1/api-keys
   *
   * Lists all API keys for the tenant.
   * Returns metadata only - never the raw key or hash.
   * The keyPrefix helps users identify which key is which.
   *
   * Only OWNER and ADMIN can view API keys.
   *
   * Guard chain: JwtAuthGuard → TenantGuard → RolesGuard(OWNER, ADMIN)
   */
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @ApiOperation({ summary: 'List API keys for tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of API key metadata',
    type: ApiKeyListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async findAll(@TenantId() tenantId: string) {
    return this.apiKeysService.findAllForTenant(tenantId);
  }

  /**
   * DELETE /api/v1/api-keys/:id
   *
   * Revokes an API key permanently. Revoked keys cannot be re-activated.
   * The key record is preserved for audit trail - not hard-deleted.
   *
   * Only OWNER and ADMIN can revoke API keys.
   *
   * Guard chain: JwtAuthGuard → TenantGuard → RolesGuard(OWNER, ADMIN)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID',
    required: true,
  })
  @ApiOperation({ summary: 'Revoke an API key (permanent)' })
  @ApiParam({ name: 'id', description: 'API key UUID' })
  @ApiResponse({
    status: 200,
    description: 'Key revoked',
    type: ApiKeyRevokedResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Key not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.apiKeysService.revoke(id, tenantId);
  }
}
