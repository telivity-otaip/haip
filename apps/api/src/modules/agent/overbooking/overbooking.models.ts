/**
 * Overbooking optimization models.
 * Expected value: E[revenue] = overbook_count × ADR × P(show) - walk_count × walk_cost × P(walk)
 */

export interface OverbookingRecommendation {
  date: string;
  totalRooms: number;
  onTheBooks: number;
  predictedNoShows: number;
  predictedCancellations: number;
  recommendedOverbookCount: number;
  walkRisk: number; // probability of walk
  expectedValue: number;
  confidence: number;
}

export interface OverbookingConfig {
  maxWalkProbability: number;
  walkCost: number;
  guaranteedNoShowRate: number;
  nonGuaranteedNoShowRate: number;
  minOccupancyToActivate: number;
}

/**
 * Calculate optimal overbooking level for a date.
 */
export function calculateOverbookingLevel(params: {
  totalRooms: number;
  onTheBooks: number;
  noShowRate: number;
  cancellationRate: number;
  adr: number;
  walkCost: number;
  maxWalkProbability: number;
}): OverbookingRecommendation {
  const {
    totalRooms,
    onTheBooks,
    noShowRate,
    cancellationRate,
    adr,
    walkCost,
    maxWalkProbability,
  } = params;

  const predictedNoShows = Math.round(onTheBooks * noShowRate * 100) / 100;
  const predictedCancellations = Math.round(onTheBooks * cancellationRate * 100) / 100;
  const expectedVacancies = predictedNoShows + predictedCancellations;

  // Binary search for optimal overbook count
  let bestCount = 0;
  let bestEv = 0;

  for (let count = 0; count <= Math.ceil(expectedVacancies * 1.5); count++) {
    // Probability of walk = P(all show and overbooked > capacity)
    const actualGuests = onTheBooks + count - expectedVacancies;
    const excessGuests = Math.max(0, actualGuests - totalRooms);

    // Simplified walk probability (normal approximation)
    const walkProb = excessGuests > 0
      ? Math.min(1, excessGuests / Math.max(1, count + 1))
      : 0;

    // Expected value
    const revenue = count * adr * (1 - noShowRate);
    const walkCostExpected = excessGuests * walkCost * walkProb;
    const ev = revenue - walkCostExpected;

    // Check walk probability constraint
    if (walkProb <= maxWalkProbability && ev > bestEv) {
      bestEv = ev;
      bestCount = count;
    }
  }

  // Recalculate walk risk for recommended count
  const finalActual = onTheBooks + bestCount - expectedVacancies;
  const finalExcess = Math.max(0, finalActual - totalRooms);
  const walkRisk = finalExcess > 0
    ? Math.min(maxWalkProbability, finalExcess / Math.max(1, bestCount + 1))
    : 0;

  return {
    date: '',
    totalRooms,
    onTheBooks,
    predictedNoShows,
    predictedCancellations,
    recommendedOverbookCount: bestCount,
    walkRisk: Math.round(walkRisk * 1000) / 1000,
    expectedValue: Math.round(bestEv),
    confidence: 0.7,
  };
}
