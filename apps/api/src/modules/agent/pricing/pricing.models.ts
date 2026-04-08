/**
 * Dynamic pricing strategy models.
 * Floor/ceiling → demand multiplier → booking pace → lead time decay.
 */

export interface RateRecommendation {
  roomTypeId: string;
  ratePlanId: string;
  date: string;
  currentRate: number;
  recommendedRate: number;
  adjustmentPct: number;
  reason: string;
  estimatedRevenueImpact: number;
}

export interface PricingConfig {
  floorRates: Record<string, number>;
  ceilingRates: Record<string, number>;
  maxAdjustmentPct: number;
  revparTarget: number;
  weekendPremiumPct: number;
  pricingHorizonDays: number;
}

/**
 * Calculate recommended rate based on demand signals.
 */
export function calculateRecommendedRate(params: {
  baseRate: number;
  predictedOccupancy: number;
  currentBookingPace: number; // ratio vs historical avg (1.0 = avg)
  daysOut: number;
  isWeekend: boolean;
  floorRate: number;
  ceilingRate: number;
  maxAdjustmentPct: number;
  weekendPremiumPct: number;
}): { rate: number; adjustmentPct: number; reason: string } {
  const {
    baseRate,
    predictedOccupancy,
    currentBookingPace,
    daysOut,
    isWeekend,
    floorRate,
    ceilingRate,
    maxAdjustmentPct,
    weekendPremiumPct,
  } = params;

  let multiplier = 1.0;
  const reasons: string[] = [];

  // 1. Demand-based multiplier
  if (predictedOccupancy > 0.85) {
    multiplier *= 1.25 + (predictedOccupancy - 0.85) * 1.67; // +25% to +50%
    reasons.push('demand_surge');
  } else if (predictedOccupancy > 0.70) {
    multiplier *= 1.10 + (predictedOccupancy - 0.70) * 1.0; // +10% to +25%
    reasons.push('demand_high');
  } else if (predictedOccupancy > 0.40) {
    multiplier *= 0.95 + (predictedOccupancy - 0.40) * 0.33; // -5% to +5%
    reasons.push('demand_moderate');
  } else {
    multiplier *= 0.80 + predictedOccupancy * 0.375; // -20% to -5%
    reasons.push('demand_low_discount');
  }

  // 2. Booking pace adjustment
  if (currentBookingPace > 1.2) {
    multiplier *= 1.05; // pace above avg → increase
    reasons.push('pace_strong');
  } else if (currentBookingPace < 0.8) {
    multiplier *= 0.95; // pace below avg → decrease
    reasons.push('pace_weak');
  }

  // 3. Lead time decay
  if (daysOut <= 3) {
    // Last-minute: amplify demand signal
    if (predictedOccupancy > 0.7) {
      multiplier *= 1.10;
      reasons.push('last_minute_premium');
    } else {
      multiplier *= 0.85;
      reasons.push('last_minute_discount');
    }
  } else if (daysOut <= 7) {
    if (predictedOccupancy > 0.6) {
      multiplier *= 1.05;
    }
  }

  // 4. Weekend premium
  if (isWeekend && weekendPremiumPct > 0) {
    multiplier *= 1 + weekendPremiumPct / 100;
    reasons.push('weekend_premium');
  }

  // Apply multiplier with max adjustment cap
  let recommended = baseRate * multiplier;

  // Cap adjustment
  const maxUp = baseRate * (1 + maxAdjustmentPct / 100);
  const maxDown = baseRate * (1 - maxAdjustmentPct / 100);
  recommended = Math.min(recommended, maxUp);
  recommended = Math.max(recommended, maxDown);

  // Apply floor/ceiling
  recommended = Math.max(recommended, floorRate);
  recommended = Math.min(recommended, ceilingRate);

  // Round to nearest dollar
  recommended = Math.round(recommended);

  const adjustmentPct = baseRate > 0
    ? Math.round(((recommended - baseRate) / baseRate) * 100)
    : 0;

  return {
    rate: recommended,
    adjustmentPct,
    reason: reasons.join(', '),
  };
}
