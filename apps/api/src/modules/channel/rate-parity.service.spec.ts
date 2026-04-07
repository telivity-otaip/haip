import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateParityService } from './rate-parity.service';

describe('RateParityService', () => {
  let service: RateParityService;
  let mockDb: any;

  const mockRatePlan = {
    id: 'rp-1',
    propertyId: 'prop-1',
    name: 'Best Available Rate',
    baseAmount: '199.99',
    isActive: true,
  };

  const mockConnection = {
    id: 'conn-1',
    propertyId: 'prop-1',
    channelCode: 'booking_com',
    channelName: 'Booking.com',
    status: 'active',
    isActive: true,
    ratePlanMapping: [{ ratePlanId: 'rp-1', channelRateCode: 'BAR' }],
    config: {},
  };

  beforeEach(() => {
    let selectCallCount = 0;
    mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockRatePlan]); // rate plans
            if (selectCallCount === 2) return Promise.resolve([mockConnection]); // connections
            return Promise.resolve([]);
          }),
        })),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    service = new RateParityService(mockDb);
  });

  describe('checkParity', () => {
    it('should report parity when no overrides exist', async () => {
      const results = await service.checkParity('prop-1');

      expect(results).toHaveLength(1);
      expect(results[0]!.ratePlanId).toBe('rp-1');
      expect(results[0]!.baseAmount).toBe(199.99);
      expect(results[0]!.channels[0]!.isParity).toBe(true);
      expect(results[0]!.parityViolations).toBe(0);
    });

    it('should detect parity violations when overrides exist', async () => {
      let selectCallCount = 0;
      const connWithOverride = {
        ...mockConnection,
        config: {
          rateOverrides: [
            { ratePlanId: 'rp-1', adjustmentType: 'percentage', adjustmentValue: -10 },
          ],
        },
      };

      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockRatePlan]);
            if (selectCallCount === 2) return Promise.resolve([connWithOverride]);
            return Promise.resolve([]);
          }),
        }),
      }));

      const results = await service.checkParity('prop-1');

      expect(results[0]!.channels[0]!.isParity).toBe(false);
      expect(results[0]!.channels[0]!.hasOverride).toBe(true);
      expect(results[0]!.channels[0]!.effectiveRate).toBeCloseTo(179.99, 1);
      expect(results[0]!.parityViolations).toBe(1);
    });

    it('should filter by specific ratePlanId', async () => {
      const results = await service.checkParity('prop-1', 'rp-1');

      expect(results).toHaveLength(1);
      expect(results[0]!.ratePlanId).toBe('rp-1');
    });
  });

  describe('getEffectiveRate', () => {
    it('should return base rate when no overrides', async () => {
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockRatePlan]);
            if (selectCallCount === 2) return Promise.resolve([mockConnection]);
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getEffectiveRate('prop-1', 'rp-1', 'conn-1');

      expect(result.baseAmount).toBe(199.99);
      expect(result.effectiveRate).toBe(199.99);
      expect(result.hasOverride).toBe(false);
    });

    it('should apply fixed override', async () => {
      let selectCallCount = 0;
      const connWithOverride = {
        ...mockConnection,
        config: {
          rateOverrides: [
            { ratePlanId: 'rp-1', adjustmentType: 'fixed', adjustmentValue: -20 },
          ],
        },
      };

      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) return Promise.resolve([mockRatePlan]);
            if (selectCallCount === 2) return Promise.resolve([connWithOverride]);
            return Promise.resolve([]);
          }),
        }),
      }));

      const result = await service.getEffectiveRate('prop-1', 'rp-1', 'conn-1');

      expect(result.effectiveRate).toBe(179.99);
      expect(result.hasOverride).toBe(true);
    });
  });

  describe('setRateOverride', () => {
    it('should add a rate override to connection config', async () => {
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            return Promise.resolve([mockConnection]);
          }),
        }),
      }));

      const override = {
        channelConnectionId: 'conn-1',
        ratePlanId: 'rp-1',
        adjustmentType: 'percentage' as const,
        adjustmentValue: -5,
        reason: 'Promotional rate',
      };

      const result = await service.setRateOverride('conn-1', 'prop-1', override);

      expect(result).toEqual(override);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('removeRateOverride', () => {
    it('should remove a rate override from connection config', async () => {
      const connWithOverride = {
        ...mockConnection,
        config: {
          rateOverrides: [
            { ratePlanId: 'rp-1', adjustmentType: 'percentage', adjustmentValue: -5 },
          ],
        },
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            return Promise.resolve([connWithOverride]);
          }),
        }),
      }));

      const result = await service.removeRateOverride('conn-1', 'prop-1', 'rp-1');

      expect(result.removed).toBe(1);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
