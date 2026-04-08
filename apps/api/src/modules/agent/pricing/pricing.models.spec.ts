import { describe, it, expect } from 'vitest';
import { calculateRecommendedRate } from './pricing.models';

const baseParams = {
  baseRate: 200,
  predictedOccupancy: 0.6,
  currentBookingPace: 1.0,
  daysOut: 14,
  isWeekend: false,
  floorRate: 120,
  ceilingRate: 600,
  maxAdjustmentPct: 30,
  weekendPremiumPct: 15,
};

describe('calculateRecommendedRate', () => {
  it('returns a rate, adjustmentPct, and reason', () => {
    const result = calculateRecommendedRate(baseParams);
    expect(result.rate).toBeGreaterThan(0);
    expect(typeof result.adjustmentPct).toBe('number');
    expect(result.reason).toBeTruthy();
  });

  it('increases rate for high demand (>85%)', () => {
    const result = calculateRecommendedRate({ ...baseParams, predictedOccupancy: 0.92 });
    expect(result.rate).toBeGreaterThan(baseParams.baseRate);
    expect(result.reason).toContain('demand_surge');
  });

  it('decreases rate for low demand (<40%)', () => {
    const result = calculateRecommendedRate({ ...baseParams, predictedOccupancy: 0.2 });
    expect(result.rate).toBeLessThan(baseParams.baseRate);
    expect(result.reason).toContain('demand_low_discount');
  });

  it('applies weekend premium when isWeekend is true', () => {
    const weekday = calculateRecommendedRate(baseParams);
    const weekend = calculateRecommendedRate({ ...baseParams, isWeekend: true });
    expect(weekend.rate).toBeGreaterThan(weekday.rate);
    expect(weekend.reason).toContain('weekend_premium');
  });

  it('boosts rate for strong booking pace', () => {
    const normal = calculateRecommendedRate(baseParams);
    const strong = calculateRecommendedRate({ ...baseParams, currentBookingPace: 1.5 });
    expect(strong.rate).toBeGreaterThanOrEqual(normal.rate);
    expect(strong.reason).toContain('pace_strong');
  });

  it('discounts for weak booking pace', () => {
    const normal = calculateRecommendedRate(baseParams);
    const weak = calculateRecommendedRate({ ...baseParams, currentBookingPace: 0.5 });
    expect(weak.rate).toBeLessThanOrEqual(normal.rate);
    expect(weak.reason).toContain('pace_weak');
  });

  it('applies last-minute premium for high demand close dates', () => {
    const result = calculateRecommendedRate({
      ...baseParams,
      daysOut: 2,
      predictedOccupancy: 0.9,
    });
    expect(result.reason).toContain('last_minute_premium');
  });

  it('applies last-minute discount for low demand close dates', () => {
    const result = calculateRecommendedRate({
      ...baseParams,
      daysOut: 2,
      predictedOccupancy: 0.3,
    });
    expect(result.reason).toContain('last_minute_discount');
  });

  it('respects floor rate', () => {
    const result = calculateRecommendedRate({
      ...baseParams,
      baseRate: 100,
      predictedOccupancy: 0.1,
      floorRate: 90,
    });
    expect(result.rate).toBeGreaterThanOrEqual(90);
  });

  it('respects ceiling rate', () => {
    const result = calculateRecommendedRate({
      ...baseParams,
      baseRate: 500,
      predictedOccupancy: 0.99,
      ceilingRate: 600,
    });
    expect(result.rate).toBeLessThanOrEqual(600);
  });

  it('caps adjustment to maxAdjustmentPct', () => {
    const result = calculateRecommendedRate({
      ...baseParams,
      predictedOccupancy: 0.99,
      isWeekend: true,
      maxAdjustmentPct: 10,
    });
    expect(Math.abs(result.adjustmentPct)).toBeLessThanOrEqual(10);
  });

  it('rounds rate to nearest dollar', () => {
    const result = calculateRecommendedRate(baseParams);
    expect(result.rate).toBe(Math.round(result.rate));
  });
});
