/**
 * AuthService — Complete authentication and password management.
 *
 * This service handles every auth-related operation in the platform:
 *
 * Token flows:
 *   register()       → create user + tenant + OWNER membership → return token pair
 *   login()          → validate email + password → return token pair
 *   refresh()        → validate refresh token → rotate → return new token pair
 *   logout()         → revoke a single refresh token
 *   logoutAll()      → revoke ALL refresh tokens for a user
 *
 * Password flows:
 *   forgotPassword() → generate a crypto-random reset token (15 min expiry)
 *   resetPassword()  → validate reset token → update password → revoke all sessions
 *   changePassword() → verify current password → update → revoke other sessions
 *
 * Security design decisions:
 *   - Access tokens are short-lived (15 min) and stateless (no DB per request)
 *   - Refresh tokens are long-lived (7 days) and stateful (hashed in DB)
 *   - Access and refresh tokens use DIFFERENT signing secrets
 *   - Reset tokens are crypto-random (not JWT), 15 min expiry, single-use
 *   - All tokens are stored as SHA-256 hashes — raw values never persisted
 *   - Password changes revoke all sessions (defense against stolen tokens)
 *   - Same error message for wrong email and wrong password (prevents enumeration)
 *   - Same response shape for existing and non-existing emails on forgot-password
 */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@prisma/prisma.service';
import { UsersService } from '@modules/users/users.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ERRORS } from '@common/constants';

/**
 * bcrypt salt rounds. 12 = 2^12 = 4096 iterations.
 * Each hash takes ~250ms — deliberately slow to resist brute force.
 * Industry standard for 2025+. Below 10 is insecure. Above 14 is too slow.
 */
const SALT_ROUNDS = 12;

/**
 * Password reset token validity period in milliseconds.
 * 15 minutes is standard — long enough to check email,
 * short enough to limit exposure if the email is compromised.
 */
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Separate signing secret for refresh tokens. */
  private readonly refreshSecret: string;

  /** Refresh token expiry (e.g., '7d'). */
  private readonly refreshExpiration: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Read refresh token config once at startup.
    // These are validated by EnvConfig — guaranteed to exist.
    this.refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET')!;
    this.refreshExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    )!;
  }

  /**
   * Convert a duration string like '7d', '24h', '30m' to seconds.
   * JwtService.sign() accepts seconds as a number without type issues.
   */
  private parseExpiryToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)(d|h|m|s)$/);
    if (!match) return 7 * 24 * 60 * 60; // fallback: 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60;
      case 'h':
        return value * 60 * 60;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return 7 * 24 * 60 * 60;
    }
  }

  // =========================================================
  // REGISTRATION
  // =========================================================

  /**
   * Register a new user with a new tenant organization.
   *
   * Creates three records in a single database transaction:
   *   1. User account (with bcrypt-hashed password)
   *   2. Tenant organization
   *   3. Membership linking the user as OWNER of the tenant
   *
   * If any step fails, the transaction rolls back — no orphaned records.
   *
   * @param dto - Validated registration data (user + tenant fields)
   * @returns Access token, refresh token, user profile, and tenant info
   * @throws ConflictException if email or tenant slug already exists
   */
  async register(dto: RegisterDto) {
    // Pre-check uniqueness outside the transaction for clear error messages.
    // Inside the transaction, Prisma would throw a raw P2002 constraint error.
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException(ERRORS.USER.EMAIL_EXISTS(dto.email));
    }

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException(ERRORS.TENANT.SLUG_EXISTS(dto.tenantSlug));
    }

    // Transaction: all three records succeed together or none do.
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create user with hashed password
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      // 2. Create tenant organization
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
          metadata: dto.tenantMetadata ?? {},
        },
      });

      // 3. Link user as OWNER — every tenant must have exactly one owner
      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      return { user, tenant };
    });

    this.logger.log(
      `Registration: ${result.user.email} → tenant ${result.tenant.slug}`,
    );

    // Generate both tokens so the user is immediately logged in
    const tokens = await this.generateTokens(result.user.id, result.user.email);

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
    };
  }

  // =========================================================
  // LOGIN
  // =========================================================

  /**
   * Authenticate a user with email and password.
   *
   * Security: returns the SAME error message for both "email not found"
   * and "wrong password." This prevents user enumeration — an attacker
   * can't determine which emails are registered by observing different
   * error messages.
   *
   * @param dto - Validated login credentials
   * @returns Access token, refresh token, and user profile
   * @throws UnauthorizedException if credentials are invalid or account is disabled
   */
  async login(dto: LoginDto) {
    // findByEmailWithPassword is the ONLY method that returns the hash.
    // It's used exclusively here — never exposed via any controller.
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Same error for "not found" and "wrong password" — prevents enumeration
    if (!user) {
      throw new UnauthorizedException(ERRORS.AUTH.INVALID_CREDENTIALS);
    }

    // Check account status before wasting time on bcrypt comparison
    if (!user.isActive) {
      throw new UnauthorizedException(ERRORS.AUTH.INACTIVE_ACCOUNT);
    }

    // bcrypt.compare is constant-time — takes the same duration whether
    // the password is correct or not. Prevents timing attacks.
    const isPasswordValid = await this.usersService.validatePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERRORS.AUTH.INVALID_CREDENTIALS);
    }

    this.logger.log(`Login: ${user.email}`);

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // =========================================================
  // TOKEN REFRESH
  // =========================================================

  /**
   * Exchange a valid refresh token for a new access + refresh token pair.
   *
   * This implements TOKEN ROTATION — the old refresh token is revoked
   * and a new one is issued every time. This limits the damage if a
   * refresh token is stolen:
   *
   *   - Attacker steals refresh token and uses it → gets new tokens
   *   - Legitimate user tries to refresh → their token is already revoked
   *   - We detect this and revoke ALL tokens for the user (breach response)
   *   - Both attacker and user are forced to re-login
   *   - User re-logins with their password; attacker can't
   *
   * This is the same pattern Auth0 and Okta use.
   *
   * @param refreshToken - The raw refresh token JWT string
   * @returns New access token + new refresh token
   * @throws UnauthorizedException if token is invalid, expired, or revoked
   */
  async refresh(refreshToken: string) {
    // Step 1: Verify the JWT signature and expiry.
    // Uses the REFRESH secret, not the access token secret.
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Step 2: Look up the hashed token in the database.
    // We store only the hash — compare hash-to-hash.
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    // Step 3: If the token is already revoked, this might be a stolen token
    // being replayed by an attacker. Revoke ALL tokens as a precaution.
    if (!storedToken || storedToken.isRevoked) {
      await this.revokeAllUserRefreshTokens(payload.sub);
      this.logger.warn(
        `Refresh token reuse detected for user ${payload.sub} — all sessions revoked`,
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Step 4: Check database-level expiry (belt and suspenders with JWT expiry)
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Step 5: Revoke the old token (rotation) and issue a new pair
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(payload.sub, payload.email);

    this.logger.log(`Token refresh: ${payload.email}`);

    return tokens;
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  /**
   * Revoke a single refresh token (single-device logout).
   *
   * The access token remains valid until it naturally expires (max 15 min).
   * This is by design — access tokens are stateless. If you need instant
   * revocation, you'd add a token blacklist in Redis (Phase 5).
   *
   * @param refreshToken - The raw refresh token to revoke
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    // updateMany won't throw if the token doesn't exist — idempotent
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log('Logout: refresh token revoked');
  }

  /**
   * Revoke ALL refresh tokens for a user (all-device logout).
   *
   * Used when:
   *   - User explicitly clicks "logout everywhere"
   *   - Password is changed or reset (security measure)
   *   - Account compromise is suspected
   *
   * @param userId - The user's UUID
   */
  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllUserRefreshTokens(userId);
    this.logger.log(
      `Logout all: all refresh tokens revoked for user ${userId}`,
    );
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  /**
   * Generate a password reset token for a user.
   *
   * Security measures:
   *   - The response is IDENTICAL whether the email exists or not.
   *     An attacker cannot tell if an email is registered.
   *   - The token is 32 bytes of crypto-random data (base64url encoded).
   *     Unguessable — 2^256 possible values.
   *   - Only the SHA-256 hash is stored in the database.
   *   - Token expires in 15 minutes.
   *   - Any existing unused tokens for the user are invalidated.
   *
   * Production note: In production, remove resetToken from the response
   * and send it via email instead. It's returned here for development testing.
   *
   * @param email - The email address to send the reset token to
   * @returns Confirmation message + reset token (dev only)
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // IMPORTANT: Same response shape whether email exists or not.
    // This prevents user enumeration attacks.
    if (!user) {
      this.logger.warn(`Forgot password: email not found (${email})`);
      return {
        message:
          'If an account exists with this email, a reset token has been generated',
        // In production: always null here. Token sent via email only.
        resetToken: null,
      };
    }

    // Invalidate any existing unused reset tokens for this user.
    // Only one reset flow should be active at a time.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Generate a crypto-secure random token.
    // randomBytes(32) produces 256 bits of randomness.
    // base64url encoding makes it URL-safe (no +, /, or = characters).
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);

    // Store only the hash — the raw token is returned once and never stored
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    this.logger.log(`Forgot password: reset token generated for ${user.email}`);

    return {
      message:
        'If an account exists with this email, a reset token has been generated',
      // TODO: In production, send this via email (SendGrid, SES, etc.)
      // and remove it from the response. Here for dev/testing only.
      resetToken: rawToken,
    };
  }

  // =========================================================
  // RESET PASSWORD (using token from forgot-password)
  // =========================================================

  /**
   * Reset a user's password using a token from the forgot-password flow.
   *
   * Validates three conditions:
   *   1. The token hash exists in the database
   *   2. The token hasn't been used before (single-use)
   *   3. The token hasn't expired (15 min window)
   *
   * After successful reset:
   *   - Password is updated with a new bcrypt hash
   *   - The reset token is marked as used (prevents replay)
   *   - ALL refresh tokens are revoked (forces re-login everywhere)
   *     This is critical — if an attacker triggered the reset,
   *     revoking sessions limits their access.
   *
   * All three operations run in a transaction for consistency.
   *
   * @param token - The raw reset token from forgot-password
   * @param newPassword - The new password (validated by DTO)
   * @returns Success message
   * @throws BadRequestException if token is invalid, used, or expired
   */
  async resetPassword(token: string, newPassword: string) {
    // Hash the submitted token and look up the hash
    const tokenHash = this.hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Validate the token — three checks
    if (!resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (resetToken.isUsed) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // All validations passed — update password and clean up
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      // Update the password
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      // Mark the token as used — single-use enforcement
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      });

      // Revoke ALL refresh tokens — forces re-login on every device.
      // This is a security measure: if an attacker initiated the reset,
      // they can't use any existing sessions afterward.
      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    this.logger.log(`Password reset: ${resetToken.user.email}`);

    return {
      message: 'Password has been reset. Please log in with your new password.',
    };
  }

  // =========================================================
  // CHANGE PASSWORD (authenticated user)
  // =========================================================

  /**
   * Change password for an authenticated user who knows their current password.
   *
   * Why require the current password?
   *   If an attacker has a stolen access token (e.g., from XSS), they could
   *   change the password and lock the real user out. Requiring the current
   *   password means the attacker needs BOTH the token AND the password.
   *
   * After successful change:
   *   - Password is updated with a new bcrypt hash
   *   - ALL other refresh tokens are revoked (other devices logged out)
   *   - A new token pair is returned for the CURRENT session
   *     so the user doesn't get kicked out of their own session
   *
   * @param userId - The authenticated user's UUID (from JWT payload)
   * @param currentPassword - Their current password for verification
   * @param newPassword - The new password (validated by DTO)
   * @returns Success message + new token pair
   * @throws UnauthorizedException if current password is wrong
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Look up the user with their password hash
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify the current password — constant-time comparison via bcrypt
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash the new password and update everything in a transaction
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      // Update the password
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Revoke all refresh tokens — logs out every other device
      await tx.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    this.logger.log(`Password changed: ${user.email}`);

    // Issue new tokens for the current session so the user
    // doesn't get logged out of the device they're using right now
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      message:
        'Password changed successfully. All other sessions have been logged out.',
      ...tokens,
    };
  }

  // =========================================================
  // PRIVATE HELPERS
  // =========================================================

  /**
   * Generate an access token + refresh token pair.
   *
   * Access token:
   *   - Signed with JWT_SECRET
   *   - Short expiry (15 min from env)
   *   - Stateless — NOT stored in the database
   *   - Sent by the frontend on every API request
   *
   * Refresh token:
   *   - Signed with JWT_REFRESH_SECRET (DIFFERENT secret)
   *   - Long expiry (7 days from env)
   *   - Stateful — SHA-256 hash stored in the database
   *   - Sent ONLY to POST /auth/refresh
   *
   * Why different secrets? If the access token secret is compromised
   * (e.g., leaked in logs), the attacker still can't forge refresh tokens.
   * And vice versa.
   *
   * @param userId - User UUID for the JWT 'sub' claim
   * @param email - User email for the JWT payload
   * @returns Object with accessToken and refreshToken strings
   */
  private async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    // Access token — primary secret, short expiry
    const accessToken = this.jwtService.sign(payload);

    // Refresh token — separate secret, long expiry
    const refreshExpirySeconds = this.parseExpiryToSeconds(
      this.refreshExpiration,
    );

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: refreshExpirySeconds,
    });

    // Store the refresh token hash in the database.
    // The raw token is returned to the client — never stored server-side.
    const tokenHash = this.hashToken(refreshToken);

    // Parse the expiry duration string (e.g., '7d') into a Date
    const expiresAt = this.calculateExpiry(this.refreshExpiration);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * SHA-256 hash a token string.
   *
   * Used for refresh tokens, reset tokens, and API keys.
   * SHA-256 is a one-way cryptographic hash:
   *   - Given a token, you can compute the hash
   *   - Given a hash, you CANNOT compute the token
   *   - Two different tokens will (practically) never produce the same hash
   *
   * @param token - Raw token string
   * @returns 64-character lowercase hex string
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Revoke all active (non-revoked) refresh tokens for a user.
   *
   * Called during:
   *   - Password change (changePassword)
   *   - Password reset (resetPassword)
   *   - Logout all (logoutAll)
   *   - Suspected token theft (refresh with already-revoked token)
   *
   * @param userId - User UUID
   */
  private async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Convert a duration string like '7d', '24h', '30m' into a Date.
   *
   * @param duration - Duration string (supports d=days, h=hours, m=minutes)
   * @returns Date object representing now + duration
   */
  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)(d|h|m)$/);
    if (!match) {
      // Fallback: 7 days if the format is unexpected
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
    }

    return now;
  }
}
