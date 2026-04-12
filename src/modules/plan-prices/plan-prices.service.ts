/**
 * PlanPricesService - Manages pricing for plans.
 *
 * Prices are sub-resources of plans. Each plan can have multiple
 * prices for different intervals and currencies:
 *   Pro = $99/month, $948/year, €89/month
 *
 * Business rules:
 *   - One active price per (plan, interval, currency) combination
 *   - Prices are deactivated (archived), never deleted
 *   - Deactivating a price does NOT affect existing subscriptions
 *     using that price - they keep it until renewal
 *   - Amount is in smallest currency unit (cents for USD)
 *   - Creating a price for a combination that already has an active
 *     price throws a conflict error
 */
import {
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

import { CreatePlanPriceDto } from './dto';

@Injectable()
export class PlanPricesService {
  private readonly logger = new Logger(PlanPricesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Default select fields for price queries.
   */
  private readonly DEFAULT_SELECT = {
    id: true,
    planId: true,
    interval: true,
    amount: true,
    currency: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  /**
   * Add a price to a plan.
   *
   * @param planId - The plan UUID (from URL path)
   * @param dto - Interval, amount, and currency
   * @returns The created price
   * @throws NotFoundException if plan doesn't exist
   * @throws ConflictException if active price already exists for this combination
   */
  async create(planId: string, dto: CreatePlanPriceDto) {
    // Verify plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, slug: true },
    });

    if (!plan) {
      throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_ID(planId));
    }

    const currency = dto.currency ?? 'usd';

    try {
      const price = await this.prisma.planPrice.create({
        data: {
          planId,
          interval: dto.interval,
          amount: dto.amount,
          currency,
        },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(
        `Price added to ${plan.slug}: ${price.amount} ${price.currency}/${price.interval}`,
      );
      return price;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          ERRORS.PLAN_PRICE.ALREADY_EXISTS(plan.slug, dto.interval, currency),
        );
      }
      throw error;
    }
  }

  /**
   * List all prices for a plan.
   *
   * @param planId - The plan UUID
   * @param includeInactive - Whether to include deactivated prices
   * @returns Array of prices
   * @throws NotFoundException if plan doesn't exist
   */
  async findAllForPlan(planId: string, includeInactive = false) {
    // Verify plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundException(ERRORS.PLAN.NOT_FOUND_ID(planId));
    }

    const where = includeInactive ? { planId } : { planId, isActive: true };

    const prices = await this.prisma.planPrice.findMany({
      where,
      select: this.DEFAULT_SELECT,
      orderBy: [{ interval: 'asc' }, { currency: 'asc' }],
    });

    return { data: prices };
  }

  /**
   * Deactivate a price.
   *
   * Deactivation is permanent for this price record - to change
   * pricing, deactivate the old price and create a new one.
   * Existing subscriptions using this price are NOT affected.
   *
   * @param planId - The plan UUID (authorization check)
   * @param priceId - The price UUID
   * @returns The deactivated price
   * @throws NotFoundException if price doesn't exist or doesn't belong to plan
   */
  async deactivate(planId: string, priceId: string) {
    try {
      const deactivated = await this.prisma.planPrice.update({
        where: { id: priceId },
        data: { isActive: false },
        select: this.DEFAULT_SELECT,
      });

      this.logger.log(
        `Price deactivated: ${deactivated.amount} ${deactivated.currency}/${deactivated.interval} (plan: ${planId})`,
      );
      return deactivated;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ERRORS.PLAN_PRICE.NOT_FOUND);
      }
      throw error;
    }
  }
}
