import { describe, it, expect } from 'vitest';
import {
  calculateNetRevenue,
  recommendChannelAllocation,
  type ChannelMetrics,
} from './channel-mix.models';

// ---------------------------------------------------------------------------
// calculateNetRevenue
// ---------------------------------------------------------------------------

describe('calculateNetRevenue', () => {
  it('returns gross rate when no commission or cancellation', () => {
    expect(calculateNetRevenue(200, 0, 0)).toBe(200);
  });

  it('deducts commission correctly', () => {
    expect(calculateNetRevenue(200, 0.15, 0)).toBeCloseTo(170);
  });

  it('deducts cancellation correctly', () => {
    expect(calculateNetRevenue(200, 0, 0.10)).toBeCloseTo(180);
  });

  it('applies both commission and cancellation', () => {
    // 200 × (1 - 0.15) × (1 - 0.10) = 200 × 0.85 × 0.90 = 153
    expect(calculateNetRevenue(200, 0.15, 0.10)).toBeCloseTo(153);
  });
});

// ---------------------------------------------------------------------------
// recommendChannelAllocation
// ---------------------------------------------------------------------------

const channels: ChannelMetrics[] = [
  {
    channelCode: 'direct',
    channelName: 'Direct',
    commissionRate: 0,
    cancellationRate: 0.03,
    avgRate: 180,
    bookingCount: 50,
    netRevPerRoom: calculateNetRevenue(180, 0, 0.03),
  },
  {
    channelCode: 'booking_com',
    channelName: 'Booking.com',
    commissionRate: 0.17,
    cancellationRate: 0.12,
    avgRate: 190,
    bookingCount: 80,
    netRevPerRoom: calculateNetRevenue(190, 0.17, 0.12),
  },
  {
    channelCode: 'expedia',
    channelName: 'Expedia',
    commissionRate: 0.20,
    cancellationRate: 0.15,
    avgRate: 185,
    bookingCount: 30,
    netRevPerRoom: calculateNetRevenue(185, 0.20, 0.15),
  },
];

describe('recommendChannelAllocation', () => {
  it('keeps all channels open at low occupancy (<50%)', () => {
    const result = recommendChannelAllocation(channels, 0.3, 100);
    for (const alloc of result) {
      expect(alloc.stopSell).toBe(false);
      expect(alloc.allocatedRooms).toBe(100);
    }
  });

  it('reduces high-commission channels at medium occupancy (50-80%)', () => {
    const result = recommendChannelAllocation(channels, 0.65, 100);
    const expedia = result.find((a) => a.channelCode === 'expedia');
    expect(expedia!.allocatedRooms).toBeLessThan(100);
    expect(expedia!.reason).toBe('medium_occupancy_reduce_high_commission');
  });

  it('stops selling expensive channels at high occupancy (80-95%)', () => {
    const result = recommendChannelAllocation(channels, 0.88, 100);
    const expedia = result.find((a) => a.channelCode === 'expedia');
    expect(expedia!.stopSell).toBe(true);
    expect(expedia!.allocatedRooms).toBe(0);
  });

  it('keeps direct channel open at high occupancy', () => {
    const result = recommendChannelAllocation(channels, 0.88, 100);
    const direct = result.find((a) => a.channelCode === 'direct');
    expect(direct!.stopSell).toBe(false);
  });

  it('closes high-commission channels at critical occupancy (>95%)', () => {
    const result = recommendChannelAllocation(channels, 0.97, 100);
    const booking = result.find((a) => a.channelCode === 'booking_com');
    const expedia = result.find((a) => a.channelCode === 'expedia');
    expect(booking!.stopSell).toBe(true);
    expect(expedia!.stopSell).toBe(true);
  });

  it('ranks by net revenue', () => {
    const result = recommendChannelAllocation(channels, 0.3, 100);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.netRevPerRoom).toBeGreaterThanOrEqual(result[i]!.netRevPerRoom);
    }
  });
});
