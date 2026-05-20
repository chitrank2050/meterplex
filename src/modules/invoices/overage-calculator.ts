/**
 * OverageCalculator - Pure function for overage billing math.
 *
 * All integer math. No floating-point anywhere.
 *
 * Input units:
 *   - used: integer (from usage_aggregates.amount)
 *   - includedAmount: integer (from entitlement snapshot)
 *   - overagePrice: integer in micro-cents (from entitlement snapshot)
 *
 * Output:
 *   - overageUnits: integer (units beyond included amount)
 *   - unitPriceMicroCents: integer (price per unit)
 *   - totalCents: integer (final line item amount)
 *
 * Conversion: totalCents = Math.round(overageUnits × overagePrice / 100)
 * Because: $1.00 = 10,000 micro-cents, $0.01 = 100 micro-cents
 * So micro-cents / 100 = cents
 *
 * The only rounding happens at the final conversion to cents.
 * This matches Stripe's approach: accumulate in smallest unit, round once.
 *
 * Examples:
 *   35,000 api_calls, 50,000 included, $0.001/call → 0 overage → $0.00
 *   55,000 api_calls, 50,000 included, $0.001/call → 5,000 overage → $0.50
 *   7 GB storage, 10 GB included, $0.02/GB → 0 overage → $0.00
 *   15 GB storage, 10 GB included, $0.02/GB → 5 GB overage → $0.10
 */

export interface OverageResult {
  /** Units beyond the included amount. */
  overageUnits: number;
  /** Per-unit price in micro-cents (from entitlement snapshot). */
  unitPriceMicroCents: number;
  /** Line item total in cents. The amount that appears on the invoice. */
  totalCents: number;
}

/**
 * Calculate overage for a single feature.
 *
 * @param used - Units consumed this period (from usage_aggregates)
 * @param includedAmount - Free units included in the plan (null = 0)
 * @param overagePriceMicroCents - Per-unit overage price in micro-cents (null = 0)
 * @returns Overage breakdown with total in cents
 */
export function calculateOverage(
  used: number,
  includedAmount: number | null,
  overagePriceMicroCents: number | null,
): OverageResult {
  const included = includedAmount ?? 0;
  const unitPrice = overagePriceMicroCents ?? 0;
  const overageUnits = Math.max(0, used - included);

  // All integer math until the final division
  const totalMicroCents = overageUnits * unitPrice;
  const totalCents = Math.round(totalMicroCents / 100);

  return {
    overageUnits,
    unitPriceMicroCents: unitPrice,
    totalCents,
  };
}
