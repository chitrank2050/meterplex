/**
 * UsersController — HTTP layer for user management.
 *
 * Routes:
 *   POST   /api/v1/users      → Create a user
 *   GET    /api/v1/users/:id   → Get user by ID
 *   PATCH  /api/v1/users/:id   → Update user profile
 *
 * No list endpoint — users are listed through tenant memberships,
 * not as a global list. Listing all users across all tenants
 * would be an admin-only operation added later.
 *
 * Auth: Currently unprotected. JWT guards added in Step 5.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

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
   * Creates a new user account. Password is hashed before storage.
   * The response NEVER includes the password hash.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * GET /api/v1/users/:id
   *
   * Returns user profile. Never includes password hash.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  /**
   * PATCH /api/v1/users/:id
   *
   * Updates user profile fields. Cannot change email or password
   * through this endpoint (those have dedicated flows).
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }
}
