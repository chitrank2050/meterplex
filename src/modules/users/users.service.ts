/**
 * UsersService - Business logic for user management.
 *
 * Handles user CRUD and password hashing. Users are global entities
 * (not tenant-scoped). Tenant association happens through memberships.
 *
 * Password security:
 *   - Passwords are bcrypt-hashed with 12 salt rounds before storage
 *   - Plain text passwords are NEVER stored, logged, or returned in responses
 *   - bcrypt is deliberately slow (~250ms per hash) to resist brute force
 *   - 12 rounds = 2^12 = 4096 iterations. Industry standard for 2025+.
 */
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '@prisma/prisma.service';
import { ERRORS } from '@common/constants/error-messages';
import { User, MembershipRole } from '@generated/prisma/client';

import { CreateUserDto, UpdateUserDto } from './dto';
import {
  isUniqueConstraintError,
  getUniqueViolationFields,
} from '@common/utils/prisma-errors';

/** bcrypt salt rounds. 12 = ~250ms per hash. Secure and performant. */
const SALT_ROUNDS = 12;

/**
 * Fields to return in API responses. Excludes passwordHash.
 *
 * Prisma's select ensures the hash never leaves the database layer.
 * Even if we accidentally log or serialize the user object,
 * the hash isn't there to leak.
 */
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** User object without passwordHash - safe for API responses. */
type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user with a hashed password.
   *
   * @param dto - Validated user creation data (plain text password)
   * @returns User object WITHOUT passwordHash
   * @throws ConflictException if email already exists
   */
  async create(dto: CreateUserDto): Promise<SafeUser> {
    // Pre-check email uniqueness with a readable error.
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(ERRORS.USER.EMAIL_EXISTS(dto.email));
    }

    // Hash the password. This is deliberately slow (~250ms).
    // Never store or log the plain text password.
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
        select: USER_SELECT,
      });

      this.logger.log(`User created: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(ERRORS.USER.EMAIL_EXISTS(dto.email));
      }
      throw error;
    }
  }

  /**
   * Find a user by ID. Returns safe user (no password hash).
   *
   * @param id - User UUID
   * @returns User without passwordHash
   * @throws NotFoundException if user doesn't exist
   */
  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(ERRORS.USER.NOT_FOUND(id));
    }

    return user;
  }

  /**
   * Find a user by email. Returns FULL user including passwordHash.
   *
   * This method is ONLY used by the auth service for login validation.
   * It is NOT exposed via any controller. The hash is needed to
   * compare against the provided password with bcrypt.compare().
   *
   * @param email - User email
   * @returns Full user object including passwordHash, or null
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Update a user's profile.
   *
   * @param id - User UUID
   * @param dto - Fields to update
   * @returns Updated user without passwordHash
   * @throws NotFoundException if user doesn't exist
   */
  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    await this.findById(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: USER_SELECT,
    });

    this.logger.log(`User updated: ${user.email} (${user.id})`);
    return user;
  }

  /**
   * Validate a password against a bcrypt hash.
   *
   * Used by the auth service during login. bcrypt.compare() is
   * constant-time - it takes the same amount of time whether
   * the password is correct or not. This prevents timing attacks
   * where an attacker measures response time to guess passwords.
   *
   * @param plainText - The password the user typed
   * @param hash - The bcrypt hash stored in the database
   * @returns true if the password matches
   */
  async validatePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Create a user and add them as a member of a tenant.
   *
   * If a user with this email already exists, we add a membership
   * to the tenant instead of creating a duplicate user.
   * This supports the multi-tenant model: one user, many tenants.
   *
   * @param dto - Validated user creation data
   * @param tenantId - The tenant to add the user to
   * @param role - The role in this tenant (defaults to DEVELOPER)
   * @returns User object without passwordHash
   * @throws ConflictException if user already belongs to this tenant
   */
  async createWithMembership(
    dto: CreateUserDto,
    tenantId: string,
    role: MembershipRole = MembershipRole.DEVELOPER,
  ): Promise<SafeUser> {
    // Check if the user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      // User exists - check if they're already in this tenant
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException(
          ERRORS.MEMBERSHIP.ALREADY_EXISTS(dto.email, tenantId),
        );
      }

      // Add membership to existing user
      await this.prisma.membership.create({
        data: {
          userId: existingUser.id,
          tenantId,
          role,
        },
      });

      this.logger.log(
        `Existing user ${dto.email} added to tenant ${tenantId} as ${role}`,
      );

      return this.findById(existingUser.id);
    }

    // New user - create account + membership in a transaction.
    // try/catch handles the race where two concurrent requests both
    // pass the findUnique check above, then one hits the unique constraint.
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
          select: USER_SELECT,
        });

        await tx.membership.create({
          data: {
            userId: newUser.id,
            tenantId,
            role,
          },
        });

        return newUser;
      });

      this.logger.log(
        `User created and added to tenant: ${dto.email} → ${tenantId} as ${role}`,
      );

      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const fields = getUniqueViolationFields(error);
        if (fields.includes('userId_tenantId')) {
          throw new ConflictException(
            ERRORS.MEMBERSHIP.ALREADY_EXISTS(dto.email, tenantId),
          );
        }
        throw new ConflictException(ERRORS.USER.EMAIL_EXISTS(dto.email));
      }
      throw error;
    }
  }
}
