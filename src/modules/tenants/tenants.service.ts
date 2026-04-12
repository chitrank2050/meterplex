/**
 * TenantsService - Business logic for tenant management.
 *
 * This is the service layer. It contains ALL business logic.
 * The controller handles HTTP concerns (request/response).
 * The service handles domain concerns (validation rules, queries, side effects).
 *
 * Why separate controller and service?
 *   - Controller: "What HTTP method? What status code? What route?"
 *   - Service: "Does this slug already exist? What data do I return?"
 *   - The same service can be used by REST controllers, GraphQL resolvers,
 *     Kafka consumers, and CLI commands - all without duplication.
 *
 * Every method receives typed inputs and returns typed outputs.
 * Prisma's generated types ensure compile-time safety on every query.
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants/error-messages';
import {
  isNotFoundError,
  isUniqueConstraintError,
} from '@common/utils/prisma-errors';

import { MembershipRole, Tenant, TenantStatus } from '@prisma/client';

import { CreateTenantDto, UpdateTenantDto } from './dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tenant (without assigning an owner).
   *
   * Used internally by the auth service during registration.
   * For user-facing tenant creation, use createWithOwner() instead.
   *
   * @param dto - Validated tenant creation data
   * @returns The created tenant
   * @throws ConflictException if slug already exists
   */
  async create(dto: CreateTenantDto): Promise<Tenant> {
    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          metadata: dto.metadata ?? {},
        },
      });

      this.logger.log(`Tenant created: ${tenant.slug} (${tenant.id})`);
      return tenant;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(ERRORS.TENANT.SLUG_EXISTS(dto.slug));
      }
      throw error;
    }
  }

  /**
   * Create a tenant and assign the creating user as OWNER.
   *
   * This is the user-facing endpoint. When an authenticated user
   * creates a tenant, they automatically become its OWNER.
   * Different from registration (which creates user + tenant together).
   *
   * Use case: existing user wants to create a second organization.
   *
   * Both records are created in a transaction - if either fails,
   * neither is persisted. No orphaned tenants without owners.
   *
   * @param dto - Validated tenant creation data
   * @param userId - The authenticated user's UUID (becomes OWNER)
   * @returns The created tenant
   * @throws ConflictException if slug already exists
   */
  async createWithOwner(
    dto: CreateTenantDto,
    userId: string,
  ): Promise<Tenant & { role: string }> {
    // Transaction: both records succeed together or none do.
    // The try/catch handles the rare race condition where two concurrent
    // requests both pass the slug check above, then one create() hits
    // the database unique constraint.
    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            metadata: dto.metadata ?? {},
          },
        });

        await tx.membership.create({
          data: {
            userId,
            tenantId: newTenant.id,
            role: MembershipRole.OWNER,
          },
        });

        return { ...newTenant, role: MembershipRole.OWNER };
      });

      this.logger.log(
        `Tenant created with owner: ${tenant.slug} (${tenant.id})`,
      );
      return tenant;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(ERRORS.TENANT.SLUG_EXISTS(dto.slug));
      }
      throw error;
    }
  }

  /**
   * List tenants the specified user belongs to (via memberships).
   *
   * This is NOT a global list - it only returns tenants where
   * the user has an active membership. This is tenant isolation
   * at the query level: users see only their own tenants.
   *
   * Each result includes the user's role in that tenant,
   * so the frontend can render role-appropriate UI.
   *
   * @param userId - User UUID
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Paginated list of tenants with the user's role in each
   */
  async findAllForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [memberships, total] = await Promise.all([
      this.prisma.membership.findMany({
        where: { userId },
        include: {
          tenant: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.membership.count({
        where: { userId },
      }),
    ]);

    return {
      data: memberships.map((m) => ({
        ...m.tenant,
        role: m.role,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List all tenants with pagination (admin operation).
   *
   * Returns ALL tenants regardless of membership.
   * Kept for internal/admin use. The user-facing endpoint
   * is findAllForUser() which filters by membership.
   *
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Object with tenants array, total count, and pagination metadata
   */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a tenant by ID.
   *
   * @param id - Tenant UUID
   * @returns The tenant
   * @throws NotFoundException if tenant doesn't exist
   */
  async findById(
    id: string,
    userId?: string,
  ): Promise<Tenant & { role?: string }> {
    try {
      if (userId) {
        const membership = await this.prisma.membership.findUniqueOrThrow({
          where: { userId_tenantId: { userId, tenantId: id } },
          include: { tenant: true },
        });

        return {
          ...membership.tenant,
          role: membership.role,
        };
      }

      return await this.prisma.tenant.findUniqueOrThrow({
        where: { id },
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.TENANT.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }

  /**
   * Find a tenant by slug.
   *
   * @param slug - Tenant slug (URL-safe identifier)
   * @returns The tenant
   * @throws NotFoundException if tenant doesn't exist
   */
  async findBySlug(slug: string): Promise<Tenant> {
    try {
      return await this.prisma.tenant.findUniqueOrThrow({
        where: { slug },
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.TENANT.NOT_FOUND_SLUG(slug));
      }
      throw error;
    }
  }

  /**
   * Update a tenant.
   *
   * @param id - Tenant UUID
   * @param dto - Fields to update (partial)
   * @returns The updated tenant
   * @throws NotFoundException if tenant doesn't exist
   */
  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    try {
      const tenant = await this.prisma.tenant.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        },
      });

      this.logger.log(`Tenant updated: ${tenant.slug} (${tenant.id})`);
      return tenant;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.TENANT.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }

  /**
   * Soft-delete a tenant by setting status to CANCELLED.
   *
   * We don't hard-delete tenants because:
   *   - Billing records must be retained for compliance
   *   - Usage data may need to be replayed for reconciliation
   *   - The tenant might want to reactivate later
   *
   * @param id - Tenant UUID
   * @returns The cancelled tenant
   * @throws NotFoundException if tenant doesn't exist
   */
  async remove(id: string): Promise<Tenant> {
    try {
      const tenant = await this.prisma.tenant.update({
        where: { id },
        data: { status: TenantStatus.CANCELLED },
      });

      this.logger.log(`Tenant cancelled: ${tenant.slug} (${tenant.id})`);
      return tenant;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.TENANT.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }
}
