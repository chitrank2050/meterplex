/**
 * AuthController — Public endpoints for registration and login.
 *
 * These endpoints are NOT protected by JWT guards — they're how
 * you GET a JWT in the first place.
 *
 * Routes:
 *   POST /api/v1/auth/register → Create user + tenant, return JWT
 *   POST /api/v1/auth/login    → Validate credentials, return JWT
 *   GET  /api/v1/auth/me       → Get current user from JWT (protected)
 */
import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   *
   * Creates a new user and tenant in a single transaction.
   * Returns a JWT so the user is immediately logged in.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and tenant' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful, JWT returned',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or tenant slug already exists',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   *
   * Validates email + password, returns a JWT.
   * Returns 401 for both wrong email and wrong password
   * (prevents user enumeration).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  /**
   * GET /api/v1/auth/me
   *
   * Returns the current authenticated user's profile.
   * This is the first protected endpoint — requires a valid JWT.
   * Tests that the full auth flow works end-to-end.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  me(
    @Request()
    req: {
      user: { id: string; email: string; firstName: string; lastName: string };
    },
  ) {
    return req.user;
  }
}
