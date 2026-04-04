/**
 * AuthService — Handles registration and login.
 *
 * Registration flow:
 *   1. Validate email is unique
 *   2. Validate tenant slug is unique
 *   3. In a single transaction: create user, create tenant, create OWNER membership
 *   4. Sign and return a JWT
 *
 * Login flow:
 *   1. Find user by email (with password hash)
 *   2. Compare provided password against hash
 *   3. Sign and return a JWT
 *
 * Why a transaction for registration?
 *   If user creation succeeds but tenant creation fails (e.g., duplicate slug),
 *   we'd have an orphaned user with no tenant. The transaction ensures
 *   all three records are created together or none are.
 */
import { ERRORS } from '@common/constants/error-messages';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with a new tenant.
   *
   * Creates user + tenant + OWNER membership in a single transaction.
   * Returns a JWT so the user is immediately logged in after registration.
   */
  async register(dto: RegisterDto) {
    // Check uniqueness before the transaction to provide clear errors.
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

    // Transaction: all three records succeed or none do.
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

      // 2. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
          metadata: dto.tenantMetadata ?? {},
        },
      });

      // 3. Create OWNER membership
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

    // Sign JWT and return
    const token = this.signToken(result.user.id, result.user.email);

    return {
      accessToken: token,
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

  /**
   * Login with email and password.
   *
   * Returns a JWT if credentials are valid.
   * Returns the same error for wrong email AND wrong password
   * to prevent user enumeration attacks.
   */
  async login(dto: LoginDto) {
    // Find user with password hash (only method that returns the hash).
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Same error for "user not found" and "wrong password" — prevents
    // attackers from discovering which emails are registered.
    if (!user) {
      throw new UnauthorizedException(ERRORS.AUTH.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ERRORS.AUTH.INACTIVE_ACCOUNT);
    }

    const isPasswordValid = await this.usersService.validatePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERRORS.AUTH.INVALID_CREDENTIALS);
    }

    this.logger.log(`Login: ${user.email}`);

    const token = this.signToken(user.id, user.email);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Sign a JWT with the user's ID and email.
   *
   * @param userId - User UUID (becomes 'sub' claim)
   * @param email - User email
   * @returns Signed JWT string
   */
  private signToken(userId: string, email: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.sign(payload);
  }
}
