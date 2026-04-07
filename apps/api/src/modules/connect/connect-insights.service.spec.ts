import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectInsightsService } from './connect-insights.service';

describe('ConnectInsightsService', () => {
  let service: ConnectInsightsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      })),
    };

    service = new ConnectInsightsService(mockDb);
  });

  describe('getRevenueInsights', () => {
    it('should return revenue metrics with suggestions', async () => {
      const mockProperty = { id: 'prop-1', totalRooms: 100 };
      const soldReservations = Array.from({ length: 95 }, (_, i) => ({
        id: `res-${i}`,
        totalAmount: '199.99',
        nights: 1,
        status: 'checked_in',
      }));

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockProperty]); // property
            if (selectCallCount === 2) return Promise.resolve(soldReservations); // sold
            if (selectCallCount === 3) return Promise.resolve([{ count: 5 }]); // new today
            if (selectCallCount === 4) return Promise.resolve([{ count: 1 }]); // cancellations
            if (selectCallCount === 5) return Promise.resolve([{ id: 'rp-1', baseAmount: '199.99', type: 'bar', isActive: true }]); // BAR
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getRevenueInsights('prop-1', '2024-06-15');

      expect(result.propertyId).toBe('prop-1');
      expect(result.occupancyRate).toBe(95);
      expect(result.roomsSold).toBe(95);
      expect(result.roomsAvailable).toBe(5);
      expect(result.adr).toBeGreaterThan(0);
      expect(result.revpar).toBeGreaterThan(0);
    });

    it('should suggest rate increase for high occupancy (>90%)', async () => {
      const mockProperty = { id: 'prop-1', totalRooms: 10 };
      const soldReservations = Array.from({ length: 10 }, () => ({
        totalAmount: '100', nights: 1,
      }));

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockProperty]);
            if (selectCallCount === 2) return Promise.resolve(soldReservations);
            if (selectCallCount === 3) return Promise.resolve([{ count: 0 }]);
            if (selectCallCount === 4) return Promise.resolve([{ count: 0 }]);
            if (selectCallCount === 5) return Promise.resolve([]);
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getRevenueInsights('prop-1', '2024-06-15');

      expect(result.occupancyRate).toBe(100);
      expect(result.suggestions.some((s: any) => s.type === 'rate_increase')).toBe(true);
      expect(result.suggestions.some((s: any) => s.type === 'stop_sell')).toBe(true);
    });

    it('should suggest rate decrease for low occupancy (<40%)', async () => {
      const mockProperty = { id: 'prop-1', totalRooms: 100 };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockProperty]);
            if (selectCallCount === 2) return Promise.resolve([]); // 0 sold
            if (selectCallCount === 3) return Promise.resolve([{ count: 0 }]);
            if (selectCallCount === 4) return Promise.resolve([{ count: 0 }]);
            if (selectCallCount === 5) return Promise.resolve([]);
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getRevenueInsights('prop-1', '2024-06-15');

      expect(result.occupancyRate).toBe(0);
      expect(result.suggestions.some((s: any) => s.type === 'rate_decrease')).toBe(true);
      expect(result.suggestions.some((s: any) => s.type === 'open_channel')).toBe(true);
    });

    it('should return zero metrics for non-existent property', async () => {
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }));

      const result = await service.getRevenueInsights('nonexistent', '2024-06-15');

      expect(result.occupancyRate).toBe(0);
      expect(result.adr).toBe(0);
      expect(result.revpar).toBe(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('getGuestTriggers', () => {
    it('should include pre-arrival for tomorrow arrivals', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]!;
      const todayStr = new Date().toISOString().split('T')[0]!;

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([{
              id: 'res-1', guestId: 'guest-1', arrivalDate: tomorrowStr,
              departureDate: '2024-06-05', nights: 3, status: 'confirmed',
            }]); // arriving tomorrow
            if (selectCallCount === 2) return Promise.resolve([{ id: 'guest-1', firstName: 'John', lastName: 'Smith', email: 'john@test.com' }]);
            // All remaining queries return empty
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getGuestTriggers('prop-1', todayStr);

      expect(result.triggers.some((t: any) => t.type === 'pre_arrival')).toBe(true);
      const preArrival = result.triggers.find((t: any) => t.type === 'pre_arrival')!;
      expect(preArrival.guestName).toBe('John Smith');
    });

    it('should include post-stay for today checkouts', async () => {
      const todayStr = new Date().toISOString().split('T')[0]!;

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            // First 4 queries (pre-arrival, check-in-ready, in-stay, pre-departure) return empty
            if (selectCallCount <= 4) return Promise.resolve([]);
            // 5th: checked out today
            if (selectCallCount === 5) return Promise.resolve([{
              id: 'res-2', guestId: 'guest-2', nights: 2, status: 'checked_out',
              checkedOutAt: new Date(),
            }]);
            // 6th: guest lookup
            if (selectCallCount === 6) return Promise.resolve([{ firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' }]);
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getGuestTriggers('prop-1', todayStr);

      expect(result.triggers.some((t: any) => t.type === 'post_stay')).toBe(true);
    });
  });

  describe('getHousekeepingInsights', () => {
    it('should return priority rooms with staffing hints', async () => {
      const tasks = [
        { id: 'task-1', roomId: 'room-1', type: 'checkout_clean', status: 'pending', propertyId: 'prop-1' },
        { id: 'task-2', roomId: 'room-2', type: 'stayover_service', status: 'pending', propertyId: 'prop-1' },
        { id: 'task-3', roomId: 'room-3', type: 'deep_clean', status: 'pending', propertyId: 'prop-1' },
      ];

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve(tasks); // housekeeping tasks
            if (selectCallCount === 2) return Promise.resolve([]); // arrivals
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getHousekeepingInsights('prop-1', '2024-06-15');

      expect(result.estimatedTaskCount).toBe(3);
      expect(result.estimatedMinutes).toBe(90); // 3 * 30
      expect(result.suggestedStaffCount).toBe(1); // 90 / 480 = ceil = 1
      expect(result.targetTurnTime).toBe(30);
      expect(result.priorityRooms).toHaveLength(3);
    });

    it('should prioritize rooms for arriving guests', async () => {
      const tasks = [
        { id: 'task-1', roomId: 'room-1', type: 'checkout_clean', status: 'pending' },
        { id: 'task-2', roomId: 'room-2', type: 'stayover_service', status: 'pending' },
      ];

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve(tasks);
            if (selectCallCount === 2) return Promise.resolve([{ roomId: 'room-1', status: 'assigned' }]); // arrival has room-1
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getHousekeepingInsights('prop-1', '2024-06-15');

      // room-1 should be first (priority 1 — arrival)
      expect(result.priorityRooms[0]!.roomId).toBe('room-1');
      expect(result.priorityRooms[0]!.reason).toContain('arriving');
    });

    it('should return zero metrics for empty property', async () => {
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }));

      const result = await service.getHousekeepingInsights('prop-1', '2024-06-15');

      expect(result.estimatedTaskCount).toBe(0);
      expect(result.suggestedStaffCount).toBe(1); // Minimum 1
      expect(result.priorityRooms).toHaveLength(0);
    });
  });
});
