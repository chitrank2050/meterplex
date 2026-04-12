/**
 * PlansService - CRUD for billing plans.
 *
 * Plans are the product identity: "Starter", "Pro", "Enterprise".
 * They do NOT contain pricing - that's in PlanPrice (separate module).
 *
 * Business rules:
 *   - slug must be unique (enforced by DB unique constraint)
 *   - Plans are ARCHIVED, never deleted (subscriptions reference them)
 *   - Archiving a plan does NOT affect existing subscribers
 *   - Public plans appear on pricing pages, private ones don't
 *   - displayOrder controls sorting on pricing pages
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ERRORS } from '@common/constants';
import {
  isNotFoundError,
  isUniqueConstraintError,
} from '@common/utils/prisma-errors';

import { PrismaService } from '@prisma/prisma.service';

import { Prisma } from '@generated/prisma/client';

import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Default select fields for plan queries.
   * Ensures consistent response shape across all methods.
   * Includes prices so the frontend can display pricing info.
   */
  private readonly DEFAULT_SELECT = {
    id: true,
    name: true,
    slug: true,
    description: true,
    status: true,
    isPublic: true,
    displayOrder: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
    prices: {
      where: { isActive: true },
      select: {
        id: true,
        interval: true,
        amount: true,
        currency: true,
        isActive: true,
      },
      orderBy: { interval: 'asc' as const },
    },
  } as const;

  /**
   * Create a new plan.
   *
   * @param dto - Plan name, slug, description, and options
   * @returns The created plan with active prices (empty initially)
   * @throws ConflictException if slug already exists
   */
  async create(dto: CreatePlanDto) {
    try {
      const plan = await this.prisma.plan.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          isPublic: dto.isPublic ?? true,
          displayOrder: dto.displayOrder ?? 0,
          metadata: (dto.metadata as Prisma.InputJsonValue) ?? {},
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(`Plan created: ${plan.name} (${plan.slug})`);
      return plan;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(ERRORS.PLAN.SLUG_EXISTS(dto.slug));
      }
      throw error;
    }
  }

  /**
   * List all plans, ordered by displayOrder.
   *
   * @param includeArchived - Whether to include ARCHIVED plans. Default: false.
   * @returns Array of plans with active prices
   */
  async findAll(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'ACTIVE' as const };

    const plans = await this.prisma.plan.findMany({
      where,
      select: this.DEFAULT_SELECT,
      orderBy: { displayOrder: 'asc' },
    });

    return { data: plans };
  }

  /**
   * Get a plan by UUID.
   *
   * @param id - Plan UUID
   * @returns Plan with active prices
   * @throws NotFoundException if plan doesn't exist
   */
  async findById(id: string) {
    try {
      return await this.prisma.plan.findUniqueOrThrow({
        where: { id },
        select: this.DEFAULT_SELECT,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }

  /**
   * Get a plan by slug.
   *
   * @param slug - Plan slug (e.g., "pro")
   * @returns Plan with active prices
   * @throws NotFoundException if plan doesn't exist
   */
  async findBySlug(slug: string) {
    try {
      return await this.prisma.plan.findUniqueOrThrow({
        where: { slug },
        select: this.DEFAULT_SELECT,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_SLUG(slug));
      }
      throw error;
    }
  }

  /**
   * Update a plan.
   *
   * slug is NOT updatable - it's the stable identifier
   * referenced by API paths and subscription records.
   *
   * @param id - Plan UUID
   * @param dto - Fields to update
   * @returns The updated plan
   * @throws NotFoundException if plan doesn't exist
   */
  async update(id: string, dto: UpdatePlanDto) {
    try {
      const plan = await this.prisma.plan.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
          ...(dto.displayOrder !== undefined && {
            displayOrder: dto.displayOrder,
          }),
          ...(dto.metadata !== undefined && {
            metadata: dto.metadata as Prisma.InputJsonValue,
          }),
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(`Plan updated: ${plan.name} (${plan.slug})`);
      return plan;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_ID(id));
      }
      throw error;
    }
  }
}
