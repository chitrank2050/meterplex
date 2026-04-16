/**
 * EntitlementCheckService - The hot path. Answers "can this tenant do X?"
 *
 * This runs on every guarded API request. Performance matters.
 *
 * Flow:
 *   1. Find tenant's active subscription
 *   2. Find the entitlement snapshot for the requested feature
 *   3. Evaluate based on feature type:
 *      BOOLEAN → return snapshot.value
 *      QUOTA   → compare usage counter against snapshot.limit
 *      METERED → always allowed (tracked for billing)
 *
 * Usage counters:
 *   Phase 2 uses a simple in-database counter approach.
 *   Phase 3 replaces this with Kafka-based async usage tracking
 *   for high-throughput scenarios.
 *
 *   For now, usage is tracked in a simple key-value approach
 *   using Redis (or in-memory for dev). The counter key format:
 *     usage:{tenantId}:{featureLookupKey}:{periodKey}
 *   Example: usage:acme-uuid:api_calls:2026-04
 *
 * TODO (Phase 3): Replace in-memory counters with Redis + Kafka pipeline.
 */
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@app-prisma/prisma.service';

import { ERRORS } from '@common/constants';

import { FeatureType, ResetPeriod, SubscriptionStatus } from '@prisma/client';

/** In-memory usage counters. Replaced by Redis in Phase 3. */
const usageCounters = new Map<string, number>();

@Injectable()
export class EntitlementCheckService {
  private readonly logger = new Logger(EntitlementCheckService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a tenant has access to a feature.
   *
   * @param tenantId - Tenant UUID
   * @param featureLookupKey - Feature lookup key (e.g., "api_calls")
   * @returns Access check result with usage info for QUOTA features
   */
  async check(tenantId: string, featureLookupKey: string) {
    const snapshot = await this.getSnapshot(tenantId, featureLookupKey);

    if (!snapshot) {
      this.logger.log(
        `Entitlement check failed: tenant ${tenantId} → feature ${featureLookupKey} (No active subscription or feature not in plan)`,
      );
      return {
        allowed: false,
        feature: featureLookupKey,
        type: 'UNKNOWN',
        reason: 'No active subscription or feature not included in plan',
      };
    }

    switch (snapshot.featureType) {
      case FeatureType.BOOLEAN:
        return {
          allowed: snapshot.value === true,
          feature: featureLookupKey,
          type: 'BOOLEAN',
          reason: snapshot.value ? null : 'Feature not included in your plan',
        };

      case FeatureType.QUOTA: {
        const used = this.getUsage(
          tenantId,
          featureLookupKey,
          snapshot.resetPeriod,
        );
        const limit = snapshot.limit ?? 0;
        const remaining = Math.max(0, limit - used);
        const allowed = snapshot.limitBehavior === 'SOFT' || used < limit;

        const reason = allowed ? null : 'Quota exceeded';

        if (!allowed) {
          this.logger.log(
            `Entitlement denied: tenant ${tenantId} → feature ${featureLookupKey} (Quota exceeded: ${used}/${limit})`,
          );
        }

        return {
          allowed,
          feature: featureLookupKey,
          type: 'QUOTA',
          limit,
          used,
          remaining,
          resetAt: this.getResetDate(snapshot.resetPeriod),
          reason,
        };
      }

      case FeatureType.METERED: {
        const used = this.getUsage(
          tenantId,
          featureLookupKey,
          snapshot.resetPeriod,
        );
        const includedAmount = snapshot.includedAmount ?? 0;

        return {
          allowed: true,
          feature: featureLookupKey,
          type: 'METERED',
          includedAmount,
          used,
          overage: Math.max(0, used - includedAmount),
          resetAt: this.getResetDate(snapshot.resetPeriod),
        };
      }

      default:
        return {
          allowed: false,
          feature: featureLookupKey,
          type: snapshot.featureType,
          reason: 'Unknown feature type',
        };
    }
  }

  /**
   * Consume units of a quota/metered feature.
   *
   * For QUOTA (HARD): blocks if usage + amount exceeds limit.
   * For QUOTA (SOFT): allows but flags as overage.
   * For METERED: always allows, tracks for billing.
   * For BOOLEAN: returns error (boolean features aren't consumable).
   *
   * @param tenantId - Tenant UUID
   * @param featureLookupKey - Feature lookup key
   * @param amount - Units to consume (default: 1)
   * @returns Consumption result with updated usage
   */
  async consume(tenantId: string, featureLookupKey: string, amount = 1) {
    const snapshot = await this.getSnapshot(tenantId, featureLookupKey);

    if (!snapshot) {
      this.logger.log(
        `Consumption failed: tenant ${tenantId} → feature ${featureLookupKey} (No active subscription or feature not in plan)`,
      );
      throw new NotFoundException(
        'No active subscription or feature not included in plan',
      );
    }

    if (snapshot.featureType === 'BOOLEAN') {
      throw new ForbiddenException(
        'Boolean features cannot be consumed. Use the check endpoint instead.',
      );
    }

    const counterKey = this.getCounterKey(
      tenantId,
      featureLookupKey,
      snapshot.resetPeriod,
    );
    const currentUsage = usageCounters.get(counterKey) ?? 0;

    // For HARD quota: check before consuming
    if (
      snapshot.featureType === 'QUOTA' &&
      snapshot.limitBehavior === 'HARD' &&
      snapshot.limit !== null
    ) {
      if (currentUsage + amount > snapshot.limit) {
        this.logger.log(
          `Consumption denied: tenant ${tenantId} → feature ${featureLookupKey} (HARD quota exceeded: ${currentUsage + amount} > ${snapshot.limit})`,
        );
        throw new ForbiddenException(
          ERRORS.ENTITLEMENT_CHECK.QUOTA_EXCEEDED(
            featureLookupKey,
            snapshot.limit,
            currentUsage,
          ),
        );
      }
    }

    // Increment the counter
    const newUsage = currentUsage + amount;
    usageCounters.set(counterKey, newUsage);

    // Determine overage
    const limit = snapshot.limit ?? snapshot.includedAmount ?? 0;
    const isOverage = newUsage > limit;
    const remaining = Math.max(0, limit - newUsage);

    this.logger.log(
      `Consumed ${amount} units of ${featureLookupKey} for tenant ${tenantId} (New usage: ${newUsage}, Overage: ${isOverage})`,
    );

    return {
      allowed: true,
      feature: featureLookupKey,
      consumed: amount,
      used: newUsage,
      remaining,
      overage: isOverage,
    };
  }

  /**
   * Find the entitlement snapshot for a tenant's active subscription + feature.
   *
   * This is the core lookup - optimized with indexes on:
   *   subscriptions(tenant_id) + entitlement_snapshots(subscription_id, feature_lookup_key)
   */
  private async getSnapshot(tenantId: string, featureLookupKey: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      select: { id: true },
    });

    if (!subscription) {
      return null;
    }

    return this.prisma.entitlementSnapshot.findUnique({
      where: {
        subscriptionId_featureLookupKey: {
          subscriptionId: subscription.id,
          featureLookupKey,
        },
      },
    });
  }

  /**
   * Get current usage count from in-memory counter.
   * TODO (Phase 3): Replace with Redis GET.
   */
  private getUsage(
    tenantId: string,
    featureLookupKey: string,
    resetPeriod: string | null,
  ): number {
    const key = this.getCounterKey(tenantId, featureLookupKey, resetPeriod);
    return usageCounters.get(key) ?? 0;
  }

  /**
   * Build the counter key. Includes the period so counters
   * auto-reset when the period changes (e.g., "2026-04" → "2026-05").
   */
  private getCounterKey(
    tenantId: string,
    featureLookupKey: string,
    resetPeriod: string | null,
  ): string {
    const periodKey = this.getPeriodKey(resetPeriod);
    return `usage:${tenantId}:${featureLookupKey}:${periodKey}`;
  }

  /**
   * Generate a period key based on reset period.
   * MONTHLY: "2026-04", ANNUALLY: "2026", NEVER: "lifetime"
   */
  private getPeriodKey(resetPeriod: string | null): string {
    const now = new Date();
    switch (resetPeriod) {
      case ResetPeriod.MONTHLY:
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      case ResetPeriod.ANNUALLY:
        return `${now.getFullYear()}`;
      case ResetPeriod.NEVER:
      default:
        return 'lifetime';
    }
  }

  /**
   * Calculate the next reset date based on period.
   */
  private getResetDate(resetPeriod: string | null): Date | null {
    const now = new Date();
    switch (resetPeriod) {
      case ResetPeriod.MONTHLY: {
        const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return reset;
      }
      case ResetPeriod.ANNUALLY: {
        const reset = new Date(now.getFullYear() + 1, 0, 1);
        return reset;
      }
      default:
        return null;
    }
  }
}
