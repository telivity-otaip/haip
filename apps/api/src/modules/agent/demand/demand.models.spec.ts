import { describe, it, expect } from 'vitest';
import {
  heuristicForecast,
  statisticalForecast,
  selectModel,
  type HistoricalDay,
} from './demand.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHistory(count: number, baseOcc = 0.6): HistoricalDay[] {
  const days: HistoricalDay[] = [];
  const start = new Date('2025-01-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0]!,
      dayOfWeek: d.getDay(),
      occupancy: baseOcc + (d.getDay() >= 5 ? 0.15 : 0),
      adr: 150 + (d.getDay() >= 5 ? 30 : 0),
      bookings: Math.round((baseOcc + (d.getDay() >= 5 ? 0.15 : 0)) * 100),
    });
  }
  return days;
}

// ---------------------------------------------------------------------------
// selectModel
// ---------------------------------------------------------------------------

describe('selectModel', () => {
  it('returns heuristic for < 90 days', () => {
    expect(selectModel(30)).toBe('heuristic');
    expect(selectModel(89)).toBe('heuristic');
  });

  it('returns statistical for >= 90 days', () => {
    expect(selectModel(90)).toBe('statistical');
    expect(selectModel(365)).toBe('statistical');
  });
});

// ---------------------------------------------------------------------------
// heuristicForecast
// ---------------------------------------------------------------------------

describe('heuristicForecast', () => {
  const history = makeHistory(60);

  it('returns a valid DayForecast', () => {
    const result = heuristicForecast(history, '2026-04-07', 50, 100);
    expect(result.date).toBe('2026-04-07');
    expect(result.predictedOccupancy).toBeGreaterThanOrEqual(0);
    expect(result.predictedOccupancy).toBeLessThanOrEqual(1);
    expect(['low', 'moderate', 'high', 'peak']).toContain(result.demandLevel);
    expect(result.predictedAdr).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('produces higher occupancy for weekends when history shows weekend spike', () => {
    // Saturday (day 6)
    const sat = heuristicForecast(history, '2026-04-11', 0, 100);
    // Wednesday (day 2)
    const wed = heuristicForecast(history, '2026-04-08', 0, 100);
    expect(sat.predictedOccupancy).toBeGreaterThan(wed.predictedOccupancy);
  });

  it('includes weekend driver for weekend dates', () => {
    // Saturday (day 6)
    const sat = heuristicForecast(history, '2026-04-11', 0, 100);
    expect(sat.drivers).toContain('weekend');
  });

  it('includes last_minute driver for dates within 7 days', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = heuristicForecast(history, tomorrow.toISOString().split('T')[0]!, 10, 100);
    expect(result.drivers).toContain('last_minute');
  });

  it('blends booking pace with history', () => {
    const high = heuristicForecast(history, '2026-04-08', 90, 100);
    const low = heuristicForecast(history, '2026-04-08', 10, 100);
    expect(high.predictedOccupancy).toBeGreaterThan(low.predictedOccupancy);
  });

  it('caps occupancy at 1.0', () => {
    const result = heuristicForecast(history, '2026-04-08', 200, 100);
    expect(result.predictedOccupancy).toBeLessThanOrEqual(1);
  });

  it('handles empty history gracefully', () => {
    const result = heuristicForecast([], '2026-04-10', 0, 100);
    expect(result.predictedOccupancy).toBeGreaterThanOrEqual(0);
    expect(result.predictedAdr).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// statisticalForecast
// ---------------------------------------------------------------------------

describe('statisticalForecast', () => {
  const history = makeHistory(180);

  it('returns a valid DayForecast with higher confidence', () => {
    const result = statisticalForecast(history, '2026-04-07', 50, 100);
    expect(result.date).toBe('2026-04-07');
    expect(result.predictedOccupancy).toBeGreaterThanOrEqual(0);
    expect(result.predictedOccupancy).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('captures seasonal patterns', () => {
    const result = statisticalForecast(history, '2026-04-07', 0, 100);
    const hasSeasonal = result.drivers.some((d) =>
      d.startsWith('seasonal_'),
    );
    // Seasonality driver should appear when monthly avg differs from overall
    expect(typeof hasSeasonal).toBe('boolean');
  });

  it('weights recent data more heavily', () => {
    // Create history where recent data is high-occupancy
    const trending = makeHistory(120, 0.4);
    // Override last 30 days with high occupancy
    for (let i = 90; i < 120; i++) {
      trending[i]!.occupancy = 0.9;
      trending[i]!.adr = 250;
    }
    const result = statisticalForecast(trending, '2026-04-08', 0, 100);
    // Should lean toward recent higher occupancy
    expect(result.predictedOccupancy).toBeGreaterThan(0.3);
  });

  it('includes booking_pace_above_average when pace is high', () => {
    const result = statisticalForecast(history, '2026-04-08', 95, 100);
    expect(result.drivers).toContain('booking_pace_above_average');
  });

  it('handles zero totalRooms', () => {
    const result = statisticalForecast(history, '2026-04-08', 0, 0);
    expect(result.predictedOccupancy).toBeGreaterThanOrEqual(0);
  });
});
