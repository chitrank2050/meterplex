/**
 * EntitlementsService - Maps features to plans with access rules.
 *
 * This is the bridge table logic: "Pro plan gets 50,000 API calls/month."
 *
 * Business rules:
 *   - One entitlement per (plan, feature) combination
 *   - The feature must exist and be ACTIVE
 *   - The plan must exist and be ACTIVE
 *   - Validates that the provided fields match the feature type:
 *       BOOLEAN → value required, limit/overage fields ignored
 *       QUOTA   → limit + resetPeriod required, limitBehavior defaults to HARD
 *       METERED → overagePrice + resetPeriod required
 *   - Updating an entitlement does NOT affect existing subscribers
 *     (they use snapshots, not live entitlements)
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants';
import {
  isNotFoundError,
  isUniqueConstraintError,
} from '@common/utils/prisma-errors';

import { FeatureType, PlanStatus } from '@prisma/client';

import { CreateEntitlementDto, UpdateEntitlementDto } from './dto';

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Default select for entitlement queries.
   * Includes the feature details so the response is self-contained.
   */
  private readonly DEFAULT_SELECT = {
    id: true,
    planId: true,
    featureId: true,
    value: true,
    limit: true,
    limitBehavior: true,
    overagePrice: true,
    includedAmount: true,
    resetPeriod: true,
    createdAt: true,
    updatedAt: true,
    feature: {
      select: {
        id: true,
        name: true,
        lookupKey: true,
        type: true,
        unit: true,
      },
    },
  };

  /**
   * Create an entitlement - map a feature to a plan with access rules.
   *
   * Validates:
   *   1. Plan exists and is ACTIVE
   *   2. Feature exists and is ACTIVE
   *   3. Fields match the feature type (see validateFieldsForType)
   *   4. No duplicate (plan, feature) combination
   *
   * @param planId - Plan UUID (from URL path)
   * @param dto - Feature ID and access rules
   * @returns The created entitlement with feature details
   */
  async create(planId: string, dto: CreateEntitlementDto) {
    // 1. Verify plan exists and is ACTIVE
    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { id: planId },
      select: { id: true, slug: true, status: true },
    });

    if (!plan) {
      throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_ID(planId));
    }

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException(
        ERRORS.ENTITLEMENT.PLAN_NOT_ACTIVE(plan.slug),
      );
    }

    // 2. Verify feature exists and is ACTIVE
    const feature = await this.prisma.feature.findUnique({
      where: { id: dto.featureId },
      select: {
        id: true,
        name: true,
        lookupKey: true,
        type: true,
        status: true,
      },
    });

    if (!feature) {
      throw new NotFoundException(ERRORS.FEATURE.NOT_FOUND_ID(dto.featureId));
    }

    if (feature.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException(
        ERRORS.ENTITLEMENT.FEATURE_NOT_ACTIVE(feature.lookupKey),
      );
    }

    // 3. Validate fields match feature type
    this.validateFieldsForType(feature.type, dto);

    // 4. Create the entitlement
    try {
      const entitlement = await this.prisma.entitlement.create({
        data: {
          planId,
          featureId: dto.featureId,
          value: dto.value,
          limit: dto.limit,
          limitBehavior: dto.limitBehavior,
          overagePrice: dto.overagePrice,
          includedAmount: dto.includedAmount,
          resetPeriod: dto.resetPeriod,
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(
        `Entitlement created: ${plan.slug} → ${feature.lookupKey} [${feature.type}]`,
      );
      return entitlement;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          ERRORS.ENTITLEMENT.ALREADY_EXISTS(plan.slug, feature.lookupKey),
        );
      }
      throw error;
    }
  }

  /**
   * List all entitlements for a plan.
   *
   * @param planId - Plan UUID
   * @returns Array of entitlements with feature details
   */
  async findAllForPlan(planId: string) {
    // Verify plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_ID(planId));
    }

    const entitlements = await this.prisma.entitlement.findMany({
      where: { planId },
      select: this.DEFAULT_SELECT,
      orderBy: { feature: { name: 'asc' } },
    });

    return { data: entitlements };
  }

  /**
   * Get a single entitlement by ID.
   *
   * @param planId - Plan UUID (authorization check)
   * @param id - Entitlement UUID
   * @returns Entitlement with feature details
   */
  async findById(planId: string, id: string) {
    const entitlement = await this.prisma.entitlement.findFirst({
      where: { id, planId },
      select: this.DEFAULT_SELECT,
    });

    if (!entitlement) {
      throw new NotFoundException(ERRORS.ENTITLEMENT.NOT_FOUND);
    }

    return entitlement;
  }

  /**
   * Update an entitlement's access rules.
   *
   * featureId is NOT updatable - delete and recreate instead.
   * Changes do NOT affect existing subscribers (they use snapshots).
   *
   * @param planId - Plan UUID
   * @param id - Entitlement UUID
   * @param dto - Fields to update
   * @returns The updated entitlement
   */
  async update(planId: string, id: string, dto: UpdateEntitlementDto) {
    try {
      const existing = await this.prisma.entitlement.findFirstOrThrow({
        where: { id, planId },
        select: { id: true, feature: { select: { type: true } } },
      });

      // Validate updated fields against feature type
      this.validateFieldsForType(existing.feature.type, dto);

      const entitlement = await this.prisma.entitlement.update({
        where: { id },
        data: {
          ...(dto.value !== undefined && { value: dto.value }),
          ...(dto.limit !== undefined && { limit: dto.limit }),
          ...(dto.limitBehavior !== undefined && {
            limitBehavior: dto.limitBehavior,
          }),
          ...(dto.overagePrice !== undefined && {
            overagePrice: dto.overagePrice,
          }),
          ...(dto.includedAmount !== undefined && {
            includedAmount: dto.includedAmount,
          }),
          ...(dto.resetPeriod !== undefined && {
            resetPeriod: dto.resetPeriod,
          }),
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(
        `Entitlement updated: ${entitlement.feature.lookupKey} on plan ${planId}`,
      );
      return entitlement;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.ENTITLEMENT.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Delete an entitlement - remove a feature from a plan.
   *
   * This is a hard delete because the entitlement is just a mapping.
   * Existing subscribers are NOT affected (they use snapshots).
   * The feature and plan remain unchanged.
   *
   * @param planId - Plan UUID
   * @param id - Entitlement UUID
   * @returns The deleted entitlement
   */
  async remove(planId: string, id: string) {
    try {
      const entitlement = await this.prisma.entitlement.findFirstOrThrow({
        where: { id, planId },
        select: this.DEFAULT_SELECT,
      });

      await this.prisma.entitlement.delete({ where: { id } });

      this.logger.log(
        `Entitlement removed: ${entitlement.feature.lookupKey} from plan ${planId}`,
      );
      return entitlement;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.ENTITLEMENT.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Validates that the provided fields are appropriate for the feature type.
   *
   * BOOLEAN features:
   *   - value is required
   *   - limit, overagePrice, includedAmount, resetPeriod must NOT be set
   *
   * QUOTA features:
   *   - limit is required
   *   - resetPeriod is required
   *   - limitBehavior defaults to HARD if not provided
   *   - value, includedAmount must NOT be set
   *
   * METERED features:
   *   - overagePrice is required
   *   - resetPeriod is required
   *   - value, limit, limitBehavior must NOT be set
   *
   * @param type - The feature type
   * @param dto - The incoming request fields
   * @throws BadRequestException if fields don't match the feature type
   */
  private validateFieldsForType(
    type: FeatureType,
    dto: CreateEntitlementDto | UpdateEntitlementDto,
  ): void {
    switch (type) {
      case FeatureType.BOOLEAN:
        if (
          dto.limit !== undefined ||
          dto.overagePrice !== undefined ||
          dto.includedAmount !== undefined
        ) {
          throw new BadRequestException(
            ERRORS.ENTITLEMENT.INVALID_BOOLEAN_FIELDS,
          );
        }
        break;

      case FeatureType.QUOTA:
        if ('featureId' in dto && dto.limit === undefined) {
          // Only require limit on create, not on partial update
          throw new BadRequestException(
            ERRORS.ENTITLEMENT.QUOTA_REQUIRES_LIMIT,
          );
        }
        if (dto.value !== undefined || dto.includedAmount !== undefined) {
          throw new BadRequestException(
            ERRORS.ENTITLEMENT.INVALID_QUOTA_FIELDS,
          );
        }
        break;

      case FeatureType.METERED:
        if ('featureId' in dto && dto.overagePrice === undefined) {
          throw new BadRequestException(
            ERRORS.ENTITLEMENT.METERED_REQUIRES_PRICE,
          );
        }
        if (
          dto.value !== undefined ||
          dto.limit !== undefined ||
          dto.limitBehavior !== undefined
        ) {
          throw new BadRequestException(
            ERRORS.ENTITLEMENT.INVALID_METERED_FIELDS,
          );
        }
        break;
    }
  }
}
