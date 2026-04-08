import { describe, it, expect } from 'vitest';
import { calculateOverbookingLevel } from './overbooking.models';

const baseParams = {
  totalRooms: 100,
  onTheBooks: 95,
  noShowRate: 0.05,
  cancellationRate: 0.08,
  adr: 200,
  walkCost: 150,
  maxWalkProbability: 0.05,
};

describe('calculateOverbookingLevel', () => {
  it('returns a valid OverbookingRecommendation', () => {
    const result = calculateOverbookingLevel(baseParams);
    expect(result.totalRooms).toBe(100);
    expect(result.onTheBooks).toBe(95);
    expect(result.predictedNoShows).toBeGreaterThan(0);
    expect(result.predictedCancellations).toBeGreaterThan(0);
    expect(typeof result.recommendedOverbookCount).toBe('number');
    expect(result.walkRisk).toBeGreaterThanOrEqual(0);
    expect(result.walkRisk).toBeLessThanOrEqual(baseParams.maxWalkProbability);
    expect(result.expectedValue).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBe(0.7);
  });

  it('recommends overbooking when expected vacancies exist', () => {
    const result = calculateOverbookingLevel(baseParams);
    // With 95 OTB, 5% no-show, 8% cancel → ~12 expected vacancies
    expect(result.recommendedOverbookCount).toBeGreaterThan(0);
  });

  it('calculates predicted no-shows and cancellations correctly', () => {
    const result = calculateOverbookingLevel(baseParams);
    expect(result.predictedNoShows).toBeCloseTo(95 * 0.05, 1);
    expect(result.predictedCancellations).toBeCloseTo(95 * 0.08, 1);
  });

  it('respects walk probability constraint', () => {
    const result = calculateOverbookingLevel({
      ...baseParams,
      maxWalkProbability: 0.01,
    });
    expect(result.walkRisk).toBeLessThanOrEqual(0.01);
  });

  it('recommends less overbooking when hotel is nearly empty', () => {
    const full = calculateOverbookingLevel(baseParams);
    const empty = calculateOverbookingLevel({
      ...baseParams,
      onTheBooks: 20,
    });
    // With 20 OTB on 100 rooms, significantly less overbooking needed
    expect(empty.recommendedOverbookCount).toBeLessThan(full.recommendedOverbookCount);
  });

  it('reduces overbooking when walk cost is very high', () => {
    const normal = calculateOverbookingLevel(baseParams);
    const expensive = calculateOverbookingLevel({
      ...baseParams,
      walkCost: 1000,
    });
    expect(expensive.recommendedOverbookCount).toBeLessThanOrEqual(
      normal.recommendedOverbookCount,
    );
  });

  it('increases overbooking with higher no-show rate', () => {
    const low = calculateOverbookingLevel({ ...baseParams, noShowRate: 0.02 });
    const high = calculateOverbookingLevel({ ...baseParams, noShowRate: 0.15 });
    expect(high.recommendedOverbookCount).toBeGreaterThanOrEqual(
      low.recommendedOverbookCount,
    );
  });

  it('positive expected value for recommended count', () => {
    const result = calculateOverbookingLevel(baseParams);
    if (result.recommendedOverbookCount > 0) {
      expect(result.expectedValue).toBeGreaterThan(0);
    }
  });

  it('handles zero rooms gracefully', () => {
    const result = calculateOverbookingLevel({
      ...baseParams,
      totalRooms: 0,
      onTheBooks: 0,
    });
    expect(result.recommendedOverbookCount).toBe(0);
  });
});
