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
  Get,
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

import { CurrentUser, Roles, TenantId } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { RolesGuard, TenantGuard } from '@common/guards';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

import { MembershipRole } from '@generated/prisma/client';

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
   * Updates a user's profile. Users can update their own profile.
   * OWNER and ADMIN can update other users' profiles within
   * their tenant (e.g., disabling an account with isActive: false).
   *
   * TODO: Add authorization check - currently any authenticated user
   * can update any profile. In Phase 2, add ownership check:
   * "is this my profile OR am I an ADMIN in a shared tenant?"
   *
   * Guard chain: JwtAuthGuard only (ownership check TODO).
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User updated',
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }
}
