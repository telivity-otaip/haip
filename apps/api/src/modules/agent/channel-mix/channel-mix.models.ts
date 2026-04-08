/**
 * Channel mix optimization models.
 * Net revenue = gross_rate × (1 - commission) × (1 - cancel_probability)
 */

export interface ChannelMetrics {
  channelCode: string;
  channelName: string;
  commissionRate: number;
  cancellationRate: number;
  avgRate: number;
  bookingCount: number;
  netRevPerRoom: number;
}

export interface ChannelAllocation {
  channelCode: string;
  allocatedRooms: number;
  stopSell: boolean;
  netRevPerRoom: number;
  reason: string;
}

/**
 * Calculate net revenue per available room for a channel.
 */
export function calculateNetRevenue(
  grossRate: number,
  commissionRate: number,
  cancellationRate: number,
): number {
  return grossRate * (1 - commissionRate) * (1 - cancellationRate);
}

/**
 * Generate channel allocation recommendations based on occupancy and net revenue.
 */
export function recommendChannelAllocation(
  channels: ChannelMetrics[],
  predictedOccupancy: number,
  totalRooms: number,
): ChannelAllocation[] {
  // Rank channels by net revenue
  const ranked = [...channels].sort((a, b) => b.netRevPerRoom - a.netRevPerRoom);

  return ranked.map((ch) => {
    let stopSell = false;
    let allocatedRooms = totalRooms;
    let reason = 'open';

    if (predictedOccupancy >= 0.95) {
      // Critical: only keep highest-value channels
      if (ch.commissionRate > 0.10) {
        stopSell = true;
        allocatedRooms = 0;
        reason = 'high_occupancy_close_high_commission';
      }
    } else if (predictedOccupancy >= 0.80) {
      // High: reduce high-commission channels
      if (ch.commissionRate > 0.15) {
        stopSell = true;
        allocatedRooms = 0;
        reason = 'occupancy_above_80_close_expensive';
      } else if (ch.commissionRate > 0.10) {
        allocatedRooms = Math.floor(totalRooms * 0.3);
        reason = 'occupancy_above_80_reduce_allocation';
      }
    } else if (predictedOccupancy >= 0.50) {
      // Medium: optimize mix
      if (ch.commissionRate > 0.18) {
        allocatedRooms = Math.floor(totalRooms * 0.5);
        reason = 'medium_occupancy_reduce_high_commission';
      }
    }
    // Low (<50%): keep all channels open for volume

    return {
      channelCode: ch.channelCode,
      allocatedRooms,
      stopSell,
      netRevPerRoom: ch.netRevPerRoom,
      reason,
    };
  });
}
