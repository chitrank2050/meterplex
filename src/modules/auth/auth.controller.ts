/**
 * AuthController - Authentication and password management endpoints.
 *
 * This controller is split into two sections:
 *
 * PUBLIC (no JWT required - these are how you GET a token):
 *   POST /auth/register        → Create user + tenant → return tokens
 *   POST /auth/login           → Validate credentials → return tokens
 *   POST /auth/refresh         → Exchange refresh token for new pair
 *   POST /auth/forgot-password → Generate password reset token
 *   POST /auth/reset-password  → Reset password using token
 *
 * PROTECTED (JWT required - these need an existing valid token):
 *   GET  /auth/me              → Get current user profile
 *   POST /auth/change-password → Change password (requires current)
 *   POST /auth/logout          → Revoke a single refresh token
 *   POST /auth/logout-all      → Revoke all sessions for the user
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
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/dto';

import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  LoginResponseDto,
  MeResponseDto,
  MessageResponseDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
  TokenPairResponseDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Type for the authenticated request user (set by JwtStrategy.validate) */
interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =========================================================
  // PUBLIC ENDPOINTS (no authentication required)
  // =========================================================

  /**
   * POST /api/v1/auth/register
   *
   * Onboarding flow: creates a new user + tenant + OWNER membership.
   * Returns both access and refresh tokens so the user is immediately
   * logged in after registration.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and tenant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Registration successful, tokens returned',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or tenant slug already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates with email + password.
   * Returns access token (15 min) + refresh token (7 days).
   * Same error for wrong email and wrong password (anti-enumeration).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful, tokens returned',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or disabled account',
    type: ErrorResponseDto,
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/v1/auth/refresh
   *
   * Exchanges a valid refresh token for a new access + refresh token pair.
   * The old refresh token is revoked (token rotation).
   *
   * Frontend flow:
   *   1. API call returns 401 (access token expired)
   *   2. Frontend calls this endpoint with the stored refresh token
   *   3. Gets new tokens, retries the original request
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token for new token pair' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access + refresh tokens returned',
    type: TokenPairResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or revoked refresh token',
    type: ErrorResponseDto,
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * POST /api/v1/auth/forgot-password
   *
   * Generates a password reset token. In production, this token
   * would be sent via email. For development, it's returned
   * directly in the response.
   *
   * The response shape is identical whether the email exists or not.
   * This prevents attackers from discovering registered emails.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reset token generated (if account exists)',
    type: ForgotPasswordResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /api/v1/auth/reset-password
   *
   * Resets the password using a token from forgot-password.
   * After reset: token is marked used, all sessions are revoked.
   * The user must log in again with their new password.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid, expired, or already-used token',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // =========================================================
  // PROTECTED ENDPOINTS (JWT required)
  // =========================================================

  /**
   * GET /api/v1/auth/me
   *
   * Returns the authenticated user's profile.
   * The user data comes from JwtStrategy.validate() which
   * looks up the user in the database on every request.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile',
    type: MeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  me(@Request() req: { user: AuthenticatedUser }) {
    return req.user;
  }

  /**
   * POST /api/v1/auth/change-password
   *
   * Changes the password for the currently authenticated user.
   * Requires the current password for verification (prevents
   * password change via stolen access token alone).
   *
   * After change: all OTHER sessions are revoked, but the
   * current session gets new tokens so the user isn't kicked out.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed, new tokens returned',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password is incorrect',
    type: ErrorResponseDto,
  })
  async changePassword(
    @Request() req: { user: AuthenticatedUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Revokes a single refresh token (current device logout).
   * The access token remains valid until it expires (max 15 min).
   * For instant revocation, a Redis token blacklist would be needed (Phase 5).
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session (revoke refresh token)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refresh token revoked',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * POST /api/v1/auth/logout-all
   *
   * Revokes ALL refresh tokens for the user (every device).
   * Use after a security incident or when the user wants to
   * force re-login everywhere.
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All sessions revoked',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
    type: ErrorResponseDto,
  })
  async logoutAll(@Request() req: { user: AuthenticatedUser }) {
    await this.authService.logoutAll(req.user.id);
    return { message: 'All sessions have been logged out' };
  }
}
