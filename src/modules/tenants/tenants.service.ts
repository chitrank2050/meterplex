/**
 * TenantsService — Business logic for tenant management.
 *
 * This is the service layer. It contains ALL business logic.
 * The controller handles HTTP concerns (request/response).
 * The service handles domain concerns (validation rules, queries, side effects).
 *
 * Why separate controller and service?
 *   - Controller: "What HTTP method? What status code? What route?"
 *   - Service: "Does this slug already exist? What data do I return?"
 *   - The same service can be used by REST controllers, GraphQL resolvers,
 *     Kafka consumers, and CLI commands — all without duplication.
 *
 * Every method receives typed inputs and returns typed outputs.
 * Prisma's generated types ensure compile-time safety on every query.
 */
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Tenant } from '@generated/prisma/client';
import { CreateTenantDto, UpdateTenantDto } from './dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tenant.
   *
   * @param dto - Validated tenant creation data
   * @returns The created tenant
   * @throws ConflictException if slug already exists
   */
  async create(dto: CreateTenantDto): Promise<Tenant> {
    // Check slug uniqueness before attempting insert.
    // Prisma would throw a raw P2002 error on duplicate — we catch it
    // here to return a clean 409 Conflict with a human-readable message.
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Tenant with slug "${dto.slug}" already exists`,
      );
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        metadata: dto.metadata ?? {},
      },
    });

    this.logger.log(`Tenant created: ${tenant.slug} (${tenant.id})`);
    return tenant;
  }

  /**
   * List all tenants with pagination.
   *
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Object with tenants array, total count, and pagination metadata
   */
  async findAll(page = 1, limit = 20) {
    // Prisma's skip/take maps directly to SQL OFFSET/LIMIT.
    // skip = how many rows to skip. take = how many to return.
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
  async findById(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  /**
   * Find a tenant by slug.
   *
   * @param slug - Tenant slug (URL-safe identifier)
   * @returns The tenant
   * @throws NotFoundException if tenant doesn't exist
   */
  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }

    return tenant;
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
    // Verify tenant exists before updating.
    // Prisma's update throws a raw P2025 on missing record —
    // we check first to return a clean 404.
    await this.findById(id);

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
    await this.findById(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Tenant cancelled: ${tenant.slug} (${tenant.id})`);
    return tenant;
  }
}
