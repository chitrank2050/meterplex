/**
 * UsersController - HTTP layer for user management.
 *
 * Routes:
 *   POST   /api/v1/users      → Create a user in a tenant (OWNER/ADMIN only)
 *   GET    /api/v1/users/me    → Get current user profile
 *   GET    /api/v1/users/:id   → Get user by ID
 *   PATCH  /api/v1/users/:id   → Update user profile
 *
 * Authorization:
 *   - Creating users requires OWNER or ADMIN role in the target tenant
 *   - Viewing and updating profiles requires authentication
 *   - Users can update their own profile; ADMIN can update others
 *
 * Response strategy:
 *   The service layer handles field filtering via Prisma select.
 *   passwordHash never enters application memory.
 *   Response DTOs exist purely for Swagger documentation.
 *
 * No global list endpoint - users are listed through tenant memberships.
 * Listing all users across all tenants is an admin-only concern.
 */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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

import { ERRORS } from '@common/constants';
import { CurrentUser, Roles, TenantId } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { RolesGuard, TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { MembershipRole } from '@prisma/client';

import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/v1/users
   *
   * Creates a new user and adds them to the specified tenant.
   * Only OWNER and ADMIN can add users to their tenant.
   *
   * This creates the user account AND a membership in one operation.
   * If the user already exists (by email), they're added to the tenant
   * as a new membership instead of creating a duplicate account.
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
  @ApiOperation({ summary: 'Create a user in a tenant (OWNER/ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'User created and added to tenant',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
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
  async create(@Body() dto: CreateUserDto, @TenantId() tenantId: string) {
    return await this.usersService.createWithMembership(dto, tenantId);
  }

  /**
   * GET /api/v1/users/me
   *
   * Returns the authenticated user's own profile.
   * No tenant context needed - user profiles are global.
   *
   * Guard chain: JwtAuthGuard only.
   *
   * IMPORTANT: This route is defined BEFORE :id to prevent
   * NestJS from interpreting "me" as a UUID parameter.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  /**
   * GET /api/v1/users/:id
   *
   * Returns a user's profile by ID.
   * Any authenticated user can view profiles - profile data
   * (name, email) is not tenant-scoped.
   *
   * Guard chain: JwtAuthGuard only.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  /**
   * PATCH /api/v1/users/:id
   *
   * Updates a user's profile with authorization:
   *   - Self-update: user can always update their own profile
   *   - Admin-in-tenant: OWNER/ADMIN of a shared tenant can update
   *     members of that tenant (requires x-tenant-id header)
   *   - isActive changes require OWNER role in a shared tenant
   *
   * Guard chain: JwtAuthGuard only (authorization logic is inline
   * because the rules differ based on self vs admin context).
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant UUID (required when updating another user)',
    required: false,
  })
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this user',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') currentUserId: string,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() dto: UpdateUserDto,
  ) {
    // Self-update: always allowed (but not isActive on yourself)
    if (id === currentUserId) {
      if (dto.isActive !== undefined) {
        throw new ForbiddenException(ERRORS.USER.CANNOT_DEACTIVATE_SELF);
      }
      return this.usersService.update(id, dto);
    }

    // Admin update: requires tenant context
    if (!tenantId) {
      throw new ForbiddenException(ERRORS.USER.UPDATE_REQUIRES_TENANT);
    }

    // Verify caller is OWNER or ADMIN in this tenant, and target is also a member
    await this.usersService.assertCallerCanUpdateUser(
      currentUserId,
      id,
      tenantId,
      dto,
    );

    return this.usersService.update(id, dto);
  }
}
