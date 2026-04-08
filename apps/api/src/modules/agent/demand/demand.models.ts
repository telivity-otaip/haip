/**
 * Demand forecasting models — heuristic → statistical progression.
 * Model selection is automatic based on available data volume.
 */

export interface DayForecast {
  date: string;
  predictedOccupancy: number; // 0.0–1.0
  demandLevel: 'low' | 'moderate' | 'high' | 'peak';
  predictedAdr: number;
  confidence: number;
  drivers: string[];
}

export interface HistoricalDay {
  date: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  occupancy: number; // 0.0–1.0
  adr: number;
  bookings: number;
}

/**
 * Heuristic model — works with minimal data.
 * Uses day-of-week averages and simple booking pace.
 */
export function heuristicForecast(
  history: HistoricalDay[],
  futureDate: string,
  onTheBooks: number,
  totalRooms: number,
): DayForecast {
  const d = new Date(futureDate);
  const dow = d.getDay();
  const isWeekend = dow === 5 || dow === 6;

  // Day-of-week average from history
  const sameDow = history.filter((h) => h.dayOfWeek === dow);
  const avgOcc = sameDow.length > 0
    ? sameDow.reduce((s, h) => s + h.occupancy, 0) / sameDow.length
    : isWeekend ? 0.7 : 0.5;

  const avgAdr = sameDow.length > 0
    ? sameDow.reduce((s, h) => s + h.adr, 0) / sameDow.length
    : 150;

  // Current booking pace
  const currentOcc = totalRooms > 0 ? onTheBooks / totalRooms : 0;
  const daysOut = Math.max(1, Math.ceil((d.getTime() - Date.now()) / (86400000)));

  // Blend historical average with current pace
  const paceWeight = Math.min(0.6, currentOcc); // more booked = trust pace more
  const predicted = avgOcc * (1 - paceWeight) + currentOcc * paceWeight;
  const predictedOccupancy = Math.min(1, Math.max(0, predicted));

  const drivers: string[] = [];
  if (isWeekend) drivers.push('weekend');
  if (currentOcc > avgOcc) drivers.push('booking_pace_above_average');
  if (currentOcc < avgOcc * 0.5) drivers.push('booking_pace_below_average');
  if (daysOut <= 7) drivers.push('last_minute');

  return {
    date: futureDate,
    predictedOccupancy,
    demandLevel: classifyDemand(predictedOccupancy),
    predictedAdr: Math.round(avgAdr * (0.8 + predictedOccupancy * 0.4)),
    confidence: Math.min(0.6, 0.3 + sameDow.length * 0.02),
    drivers,
  };
}

/**
 * Statistical model — weighted moving average with seasonality.
 * Requires 90+ days of history.
 */
export function statisticalForecast(
  history: HistoricalDay[],
  futureDate: string,
  onTheBooks: number,
  totalRooms: number,
): DayForecast {
  const d = new Date(futureDate);
  const dow = d.getDay();
  const month = d.getMonth();
  const isWeekend = dow === 5 || dow === 6;

  // Day-of-week seasonality decomposition
  const sameDow = history.filter((h) => h.dayOfWeek === dow);
  const sameMonth = history.filter((h) => new Date(h.date).getMonth() === month);

  // Weighted moving average (recent data weighted more)
  const sorted = [...sameDow].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let weightSum = 0;
  let occSum = 0;
  let adrSum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const weight = 1 / (i + 1); // exponential decay
    occSum += sorted[i]!.occupancy * weight;
    adrSum += sorted[i]!.adr * weight;
    weightSum += weight;
  }
  const wmAvgOcc = weightSum > 0 ? occSum / weightSum : 0.5;
  const wmAvgAdr = weightSum > 0 ? adrSum / weightSum : 150;

  // Monthly seasonality factor
  const monthlyAvg = sameMonth.length > 0
    ? sameMonth.reduce((s, h) => s + h.occupancy, 0) / sameMonth.length
    : wmAvgOcc;
  const overallAvg = history.reduce((s, h) => s + h.occupancy, 0) / history.length;
  const seasonalFactor = overallAvg > 0 ? monthlyAvg / overallAvg : 1;

  // Blend with booking pace
  const currentOcc = totalRooms > 0 ? onTheBooks / totalRooms : 0;
  const daysOut = Math.max(1, Math.ceil((d.getTime() - Date.now()) / 86400000));
  const paceWeight = Math.min(0.7, currentOcc + (daysOut < 14 ? 0.2 : 0));

  const basePredict = wmAvgOcc * seasonalFactor;
  const predicted = basePredict * (1 - paceWeight) + currentOcc * paceWeight;
  const predictedOccupancy = Math.min(1, Math.max(0, predicted));

  const drivers: string[] = [];
  if (isWeekend) drivers.push('weekend');
  if (seasonalFactor > 1.1) drivers.push('seasonal_high');
  if (seasonalFactor < 0.9) drivers.push('seasonal_low');
  if (currentOcc > wmAvgOcc) drivers.push('booking_pace_above_average');
  if (currentOcc < wmAvgOcc * 0.5) drivers.push('booking_pace_below_average');
  if (daysOut <= 7) drivers.push('last_minute');

  return {
    date: futureDate,
    predictedOccupancy,
    demandLevel: classifyDemand(predictedOccupancy),
    predictedAdr: Math.round(wmAvgAdr * seasonalFactor * (0.85 + predictedOccupancy * 0.3)),
    confidence: Math.min(0.85, 0.5 + sorted.length * 0.01),
    drivers,
  };
}

/**
 * Select the best available model based on data volume.
 */
export function selectModel(historyDays: number): 'heuristic' | 'statistical' {
  if (historyDays >= 90) return 'statistical';
  return 'heuristic';
}

function classifyDemand(occupancy: number): DayForecast['demandLevel'] {
  if (occupancy >= 0.85) return 'peak';
  if (occupancy >= 0.65) return 'high';
  if (occupancy >= 0.40) return 'moderate';
  return 'low';
}
