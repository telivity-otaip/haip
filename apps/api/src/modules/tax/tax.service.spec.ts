import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaxService } from './tax.service';
import { DRIZZLE } from '../../database/database.module';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const miamiProfile = {
  id: 'tp-miami',
  propertyId: 'prop-001',
  name: 'Miami Beach Tax Profile',
  jurisdictionCode: 'US-FL-MIAMI-BEACH',
  isActive: true,
  effectiveFrom: '2024-01-01',
  effectiveTo: null,
};

const miamiRules = [
  {
    id: 'rule-fl-sales',
    taxProfileId: 'tp-miami',
    name: 'Florida State Sales Tax',
    code: 'FL_SALES',
    type: 'percentage',
    rate: '6.0000',
    appliesToChargeTypes: ['room'],
    exemptions: null,
    isCompounding: false,
    isActive: true,
    sortOrder: 1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
  {
    id: 'rule-surtax',
    taxProfileId: 'tp-miami',
    name: 'Miami-Dade Surtax',
    code: 'MIAMI_SURTAX',
    type: 'percentage',
    rate: '1.0000',
    appliesToChargeTypes: ['room'],
    exemptions: null,
    isCompounding: false,
    isActive: true,
    sortOrder: 2,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
  {
    id: 'rule-tdt',
    taxProfileId: 'tp-miami',
    name: 'Tourist Development Tax',
    code: 'TDT',
    type: 'percentage',
    rate: '6.0000',
    appliesToChargeTypes: ['room'],
    exemptions: { guestTypes: ['government'] },
    isCompounding: false,
    isActive: true,
    sortOrder: 3,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
];

const barcelonaProfile = {
  id: 'tp-bcn',
  propertyId: 'prop-002',
  name: 'Barcelona Tax Profile',
  jurisdictionCode: 'ES-CT-BARCELONA',
  isActive: true,
  effectiveFrom: '2024-01-01',
  effectiveTo: null,
};

const barcelonaRules = [
  {
    id: 'rule-iva',
    taxProfileId: 'tp-bcn',
    name: 'IVA (Spanish VAT)',
    code: 'ES_IVA',
    type: 'percentage',
    rate: '10.0000',
    appliesToChargeTypes: ['room'],
    exemptions: null,
    isCompounding: false,
    isActive: true,
    sortOrder: 1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
  {
    id: 'rule-tourist',
    taxProfileId: 'tp-bcn',
    name: 'Tourist Tax (Barcelona)',
    code: 'BCN_TOURIST',
    type: 'flat_per_night',
    rate: '3.5000',
    appliesToChargeTypes: ['room'],
    exemptions: { maxNights: 7 },
    isCompounding: false,
    isActive: true,
    sortOrder: 2,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
];

const compoundingRules = [
  {
    id: 'rule-base',
    taxProfileId: 'tp-compound',
    name: 'Base Tax',
    code: 'BASE_TAX',
    type: 'percentage',
    rate: '10.0000',
    appliesToChargeTypes: ['room'],
    exemptions: null,
    isCompounding: false,
    isActive: true,
    sortOrder: 1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
  {
    id: 'rule-compound',
    taxProfileId: 'tp-compound',
    name: 'Compound Tax',
    code: 'COMPOUND_TAX',
    type: 'percentage',
    rate: '5.0000',
    appliesToChargeTypes: ['room'],
    exemptions: null,
    isCompounding: true,
    isActive: true,
    sortOrder: 2,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
];

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

function createMockDb(config: {
  profileResult?: any[];
  rulesResult?: any[];
  guestResult?: any[];
  insertResult?: any[];
  updateResult?: any[];
  deleteResult?: any[];
}) {
  let selectCallCount = 0;
  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockImplementation(() => {
            selectCallCount++;
            return config.rulesResult ?? [];
          }),
          then: (resolve: any) => {
            selectCallCount++;
            if (selectCallCount === 1) return resolve(config.profileResult ?? []);
            if (selectCallCount === 2) return resolve(config.rulesResult ?? []);
            return resolve(config.guestResult ?? []);
          },
        }),
        orderBy: vi.fn().mockReturnValue(config.profileResult ?? []),
      }),
    })),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(config.insertResult ?? []),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(config.updateResult ?? []),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(config.deleteResult ?? []),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaxService', () => {
  // =========================================================================
  // Profile CRUD
  // =========================================================================

  describe('Profile CRUD', () => {
    it('should create a tax profile', async () => {
      const mockDb = createMockDb({ insertResult: [miamiProfile] });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.createProfile({
        propertyId: 'prop-001',
        name: 'Miami Beach Tax Profile',
        jurisdictionCode: 'US-FL-MIAMI-BEACH',
        effectiveFrom: '2024-01-01',
      });

      expect(result).toEqual(miamiProfile);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should find a profile by id', async () => {
      const mockDb = createMockDb({ profileResult: [miamiProfile] });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.findProfile('tp-miami', 'prop-001');
      expect(result.jurisdictionCode).toBe('US-FL-MIAMI-BEACH');
    });

    it('should throw NotFoundException for missing profile', async () => {
      const mockDb = createMockDb({ profileResult: [] });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      await expect(service.findProfile('nonexistent', 'prop-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update a profile', async () => {
      const updated = { ...miamiProfile, name: 'Updated Name' };
      const mockDb = createMockDb({
        profileResult: [miamiProfile],
        updateResult: [updated],
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.updateProfile('tp-miami', 'prop-001', { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should list profiles for a property', async () => {
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue([miamiProfile, barcelonaProfile]),
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.listProfiles('prop-001');
      expect(result).toHaveLength(2);
    });
  });

  // =========================================================================
  // Rule CRUD
  // =========================================================================

  describe('Rule CRUD', () => {
    it('should create a tax rule', async () => {
      const mockDb = createMockDb({
        profileResult: [miamiProfile],
        insertResult: [miamiRules[0]],
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.createRule('tp-miami', 'prop-001', {
        name: 'Florida State Sales Tax',
        code: 'FL_SALES',
        type: 'percentage',
        rate: '6.0000',
        appliesToChargeTypes: ['room'],
        effectiveFrom: '2024-01-01',
      });

      expect(result!.code).toBe('FL_SALES');
    });

    it('should delete a tax rule', async () => {
      const mockDb = createMockDb({
        profileResult: [miamiProfile],
        deleteResult: [miamiRules[0]],
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.deleteRule('rule-fl-sales', 'tp-miami', 'prop-001');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw when deleting nonexistent rule', async () => {
      const mockDb = createMockDb({
        profileResult: [miamiProfile],
        deleteResult: [],
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      await expect(service.deleteRule('nonexistent', 'tp-miami', 'prop-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // US Tax Calculation (Miami Beach — 3 rules, 13% total)
  // =========================================================================

  describe('US Tax Calculation (Miami Beach)', () => {
    let service: TaxService;

    beforeEach(async () => {
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(miamiRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([{ ...miamiProfile, rules: miamiRules }]);
                return resolve(miamiRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      service = module.get<TaxService>(TaxService);
    });

    it('should calculate 13% total on a $200 room charge', async () => {
      const items = await service.calculateTaxes('200.00', 'room', 'prop-001', '2026-04-07');

      expect(items).toHaveLength(3);
      expect(items[0]!.code).toBe('FL_SALES');
      expect(items[0]!.amount).toBe('12.00'); // 6% of $200
      expect(items[1]!.code).toBe('MIAMI_SURTAX');
      expect(items[1]!.amount).toBe('2.00'); // 1% of $200
      expect(items[2]!.code).toBe('TDT');
      expect(items[2]!.amount).toBe('12.00'); // 6% of $200
      // Total: $26 = 13% of $200
      const total = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      expect(total).toBe(26);
    });

    it('should calculate tax on a $150 room charge', async () => {
      const items = await service.calculateTaxes('150.00', 'room', 'prop-001', '2026-04-07');

      const total = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      expect(total).toBeCloseTo(19.5, 2); // 13% of $150
    });

    it('should return empty for non-room charge type when rules only apply to room', async () => {
      const items = await service.calculateTaxes('50.00', 'minibar', 'prop-001', '2026-04-07');
      expect(items).toHaveLength(0);
    });
  });

  // =========================================================================
  // Government exemption
  // =========================================================================

  describe('Exemptions', () => {
    it('should exempt government guest from Tourist Development Tax', async () => {
      // calculateTaxes flow:
      // 1. getActiveTaxProfile → select().from(taxProfiles).where(...) → thenable → profile
      // 2.                     → select().from(taxRules).where(...).orderBy() → rules
      // 3.                     → select().from(guests).where(...) → thenable → guest
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(miamiRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) return resolve([miamiProfile]);
                // selectCallCount >= 2: guest lookup
                return resolve([{ id: 'guest-gov', vipLevel: 'government' }]);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const items = await service.calculateTaxes('200.00', 'room', 'prop-001', '2026-04-07', {
        guestId: 'guest-gov',
      });

      // Government guests exempt from TDT (6%), only pay FL Sales (6%) + Surtax (1%) = 7%
      expect(items).toHaveLength(2);
      expect(items.find(i => i.code === 'TDT')).toBeUndefined();
      const total = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      expect(total).toBe(14); // 7% of $200
    });

    it('should exempt long-stay guests when minStayNights is set', async () => {
      const longStayRules = [
        {
          ...miamiRules[0],
          exemptions: { minStayNights: 30 },
        },
      ];

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(longStayRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([miamiProfile]);
                return resolve(longStayRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      // Stay of 30+ nights — exempt
      const items = await service.calculateTaxes('200.00', 'room', 'prop-001', '2026-04-07', {
        numberOfNights: 35,
      });
      expect(items).toHaveLength(0);
    });
  });

  // =========================================================================
  // EU Tax — Barcelona (IVA + capped tourist tax)
  // =========================================================================

  describe('EU Tax Calculation (Barcelona)', () => {
    let service: TaxService;

    beforeEach(async () => {
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(barcelonaRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([barcelonaProfile]);
                return resolve(barcelonaRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      service = module.get<TaxService>(TaxService);
    });

    it('should calculate IVA + tourist tax for a room charge', async () => {
      const items = await service.calculateTaxes('150.00', 'room', 'prop-002', '2026-04-07', {
        numberOfNights: 1,
        nightNumber: 1,
      });

      expect(items).toHaveLength(2);
      expect(items[0]!.code).toBe('ES_IVA');
      expect(items[0]!.amount).toBe('15.00'); // 10% IVA
      expect(items[1]!.code).toBe('BCN_TOURIST');
      expect(items[1]!.amount).toBe('3.50'); // €3.50 flat per night
    });

    it('should cap tourist tax at 7 nights', async () => {
      // Night 8 — tourist tax should be skipped
      const items = await service.calculateTaxes('150.00', 'room', 'prop-002', '2026-04-07', {
        numberOfNights: 10,
        nightNumber: 8,
      });

      expect(items).toHaveLength(1);
      expect(items[0]!.code).toBe('ES_IVA');
      // No tourist tax — capped at 7 nights
      expect(items.find(i => i.code === 'BCN_TOURIST')).toBeUndefined();
    });

    it('should charge tourist tax on night 7 (last eligible night)', async () => {
      const items = await service.calculateTaxes('150.00', 'room', 'prop-002', '2026-04-07', {
        numberOfNights: 1,
        nightNumber: 7,
      });

      expect(items).toHaveLength(2);
      expect(items[1]!.code).toBe('BCN_TOURIST');
      expect(items[1]!.amount).toBe('3.50');
    });
  });

  // =========================================================================
  // Compounding tax (tax-on-tax)
  // =========================================================================

  describe('Compounding Tax', () => {
    it('should calculate compound tax on base + first tax', async () => {
      let selectCallCount = 0;
      const compoundProfile = { ...miamiProfile, id: 'tp-compound' };
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(compoundingRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([compoundProfile]);
                return resolve(compoundingRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const items = await service.calculateTaxes('100.00', 'room', 'prop-001', '2026-04-07');

      expect(items).toHaveLength(2);
      // Base tax: 10% of $100 = $10
      expect(items[0]!.amount).toBe('10.00');
      // Compound tax: 5% of ($100 + $10) = 5% of $110 = $5.50
      expect(items[1]!.amount).toBe('5.50');
      expect(items[1]!.isCompounding).toBe(true);
    });
  });

  // =========================================================================
  // Flat per-stay
  // =========================================================================

  describe('Flat Per-Stay Tax', () => {
    it('should apply flat per-stay amount regardless of nights', async () => {
      const flatPerStayRules = [
        {
          ...miamiRules[0],
          type: 'flat_per_stay',
          rate: '25.0000',
          code: 'RESORT_FEE',
          name: 'Resort Fee',
        },
      ];

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(flatPerStayRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([miamiProfile]);
                return resolve(flatPerStayRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const items = await service.calculateTaxes('200.00', 'room', 'prop-001', '2026-04-07', {
        numberOfNights: 5,
      });

      expect(items).toHaveLength(1);
      expect(items[0]!.amount).toBe('25.00');
      expect(items[0]!.code).toBe('RESORT_FEE');
    });
  });

  // =========================================================================
  // Flat per-night
  // =========================================================================

  describe('Flat Per-Night Tax', () => {
    it('should multiply flat rate by number of nights', async () => {
      const flatPerNightRules = [
        {
          ...miamiRules[0],
          type: 'flat_per_night',
          rate: '5.0000',
          code: 'CITY_TAX',
          name: 'City Tax',
        },
      ];

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(flatPerNightRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([miamiProfile]);
                return resolve(flatPerNightRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const items = await service.calculateTaxes('200.00', 'room', 'prop-001', '2026-04-07', {
        numberOfNights: 3,
      });

      expect(items).toHaveLength(1);
      expect(items[0]!.amount).toBe('15.00'); // $5 x 3 nights
    });
  });

  // =========================================================================
  // No active profile
  // =========================================================================

  describe('No Active Profile', () => {
    it('should return empty taxes when no active profile exists', async () => {
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue([]),
              then: (resolve: any) => resolve([]),
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const items = await service.calculateTaxes('200.00', 'room', 'prop-001', '2026-04-07');
      expect(items).toHaveLength(0);
    });
  });

  // =========================================================================
  // Tax-inclusive back-calculation
  // =========================================================================

  describe('Tax-Inclusive Back-Calculation', () => {
    it('should back-calculate base from tax-inclusive total', async () => {
      // Miami: 13% total percentage
      // Total €226 inclusive → base = 226 / 1.13 = 200
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(miamiRules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) resolve([miamiProfile]);
                return resolve(miamiRules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.backCalculateFromInclusive(
        '226.00',
        'room',
        'prop-001',
        '2026-04-07',
      );

      expect(parseFloat(result.baseAmount)).toBeCloseTo(200, 0);
      expect(result.taxes.length).toBe(3);
    });

    it('should return original amount when no profile exists', async () => {
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue([]),
              then: (resolve: any) => resolve([]),
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      const service = module.get<TaxService>(TaxService);

      const result = await service.backCalculateFromInclusive(
        '200.00',
        'room',
        'prop-001',
        '2026-04-07',
      );

      expect(result.baseAmount).toBe('200.00');
      expect(result.taxes).toHaveLength(0);
    });
  });

  // =========================================================================
  // Split-component tax (Germany Berlin — breakfast split across VAT rates)
  // =========================================================================

  describe('Split-Component Tax (Germany Berlin)', () => {
    const berlinProfile = {
      id: 'tp-berlin',
      propertyId: 'prop-004',
      name: 'Germany Berlin Tax Profile',
      jurisdictionCode: 'DE-BE-BERLIN',
      isActive: true,
      effectiveFrom: '2024-01-01',
      effectiveTo: null,
    };

    const berlinRules = [
      {
        id: 'rule-de-accom',
        taxProfileId: 'tp-berlin',
        name: 'Accommodation VAT',
        code: 'DE_ACCOM_VAT',
        type: 'percentage',
        rate: '7.00',
        splitPercentage: null,
        appliesToChargeTypes: ['room', 'room_upgrade'],
        exemptions: null,
        isCompounding: false,
        isActive: true,
        sortOrder: 1,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      },
      {
        id: 'rule-de-city',
        taxProfileId: 'tp-berlin',
        name: 'City Tax (Übernachtungsteuer)',
        code: 'DE_CITY_TAX',
        type: 'percentage',
        rate: '5.00',
        splitPercentage: null,
        appliesToChargeTypes: ['room'],
        exemptions: { guestTypes: ['business'] },
        isCompounding: false,
        isActive: true,
        sortOrder: 2,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      },
      {
        id: 'rule-de-food',
        taxProfileId: 'tp-berlin',
        name: 'Food VAT',
        code: 'DE_FOOD_VAT',
        type: 'split_component',
        rate: '7.00',
        splitPercentage: '70.00',
        appliesToChargeTypes: ['breakfast', 'meal', 'half_board', 'full_board'],
        exemptions: null,
        isCompounding: false,
        isActive: true,
        sortOrder: 1,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      },
      {
        id: 'rule-de-bev',
        taxProfileId: 'tp-berlin',
        name: 'Beverage VAT',
        code: 'DE_BEVERAGE_VAT',
        type: 'split_component',
        rate: '19.00',
        splitPercentage: '30.00',
        appliesToChargeTypes: ['breakfast', 'meal', 'half_board', 'full_board'],
        exemptions: null,
        isCompounding: false,
        isActive: true,
        sortOrder: 2,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      },
      {
        id: 'rule-de-std',
        taxProfileId: 'tp-berlin',
        name: 'Standard VAT',
        code: 'DE_STD_VAT',
        type: 'percentage',
        rate: '19.00',
        splitPercentage: null,
        appliesToChargeTypes: ['minibar', 'spa', 'parking', 'telephone', 'laundry'],
        exemptions: null,
        isCompounding: false,
        isActive: true,
        sortOrder: 1,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      },
    ];

    function buildBerlinDb(rulesOverride?: any[], guestOverride?: any) {
      const rules = rulesOverride ?? berlinRules;
      let selectCallCount = 0;
      return {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue(rules),
              then: (resolve: any) => {
                selectCallCount++;
                if (selectCallCount === 1) return resolve([berlinProfile]);
                if (guestOverride !== undefined) return resolve([guestOverride]);
                return resolve(rules);
              },
            }),
          }),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    }

    async function makeService(mockDb: any) {
      const module = await Test.createTestingModule({
        providers: [TaxService, { provide: DRIZZLE, useValue: mockDb }],
      }).compile();
      return module.get<TaxService>(TaxService);
    }

    it('should calculate split-component tax on a €20 breakfast (7% on 70% + 19% on 30%)', async () => {
      // Use only the two split rules to isolate the math
      const splitOnlyRules = berlinRules.filter(r => r.type === 'split_component');
      const service = await makeService(buildBerlinDb(splitOnlyRules));

      const items = await service.calculateTaxes('20.00', 'breakfast', 'prop-004', '2026-04-07');

      expect(items).toHaveLength(2);
      // 7% of (20 * 70%) = 7% of 14 = 0.98
      expect(items[0]!.code).toBe('DE_FOOD_VAT');
      expect(items[0]!.amount).toBe('0.98');
      // 19% of (20 * 30%) = 19% of 6 = 1.14
      expect(items[1]!.code).toBe('DE_BEVERAGE_VAT');
      expect(items[1]!.amount).toBe('1.14');

      const total = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      expect(total).toBeCloseTo(2.12, 2);
    });

    it('should back-calculate €22.12 gross breakfast to €20 net', async () => {
      const splitOnlyRules = berlinRules.filter(r => r.type === 'split_component');
      const service = await makeService(buildBerlinDb(splitOnlyRules));

      const result = await service.backCalculateFromInclusive(
        '22.12',
        'breakfast',
        'prop-004',
        '2026-04-07',
      );

      // Effective rate = 0.7*0.07 + 0.3*0.19 = 0.049 + 0.057 = 0.106 (10.6%)
      // net = 22.12 / 1.106 = 20.00 (to 2 dp)
      expect(parseFloat(result.baseAmount)).toBeCloseTo(20, 1);
    });

    it('should apply 7% accommodation VAT + 5% city tax on a €100 room charge', async () => {
      const service = await makeService(buildBerlinDb());

      const items = await service.calculateTaxes('100.00', 'room', 'prop-004', '2026-04-07');

      expect(items).toHaveLength(2);
      expect(items[0]!.code).toBe('DE_ACCOM_VAT');
      expect(items[0]!.amount).toBe('7.00');
      expect(items[1]!.code).toBe('DE_CITY_TAX');
      expect(items[1]!.amount).toBe('5.00');
      const total = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      expect(total).toBeCloseTo(12, 2);
    });

    it('should apply split-component rules on a €20 breakfast (full Berlin profile)', async () => {
      const service = await makeService(buildBerlinDb());

      const items = await service.calculateTaxes('20.00', 'breakfast', 'prop-004', '2026-04-07');

      // Only split rules apply to breakfast charge type
      expect(items).toHaveLength(2);
      const total = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      expect(total).toBeCloseTo(2.12, 2);
    });

    it('should apply 19% standard VAT on a €10 minibar charge', async () => {
      const service = await makeService(buildBerlinDb());

      const items = await service.calculateTaxes('10.00', 'minibar', 'prop-004', '2026-04-07');

      expect(items).toHaveLength(1);
      expect(items[0]!.code).toBe('DE_STD_VAT');
      expect(items[0]!.amount).toBe('1.90');
    });

    it('should exempt business guests from city tax (only accommodation VAT applies)', async () => {
      const service = await makeService(
        buildBerlinDb(undefined, { id: 'guest-biz', vipLevel: 'business' }),
      );

      const items = await service.calculateTaxes('100.00', 'room', 'prop-004', '2026-04-07', {
        guestId: 'guest-biz',
      });

      expect(items).toHaveLength(1);
      expect(items[0]!.code).toBe('DE_ACCOM_VAT');
      expect(items[0]!.amount).toBe('7.00');
      expect(items.find(i => i.code === 'DE_CITY_TAX')).toBeUndefined();
    });

    it('should calculate independent split rules that do not sum to 100%', async () => {
      // Two split rules: 50% at 10%, 30% at 20% — should each compute independently
      const partialRules = [
        {
          id: 'rule-split-a',
          taxProfileId: 'tp-berlin',
          name: 'Split A',
          code: 'SPLIT_A',
          type: 'split_component',
          rate: '10.00',
          splitPercentage: '50.00',
          appliesToChargeTypes: ['breakfast'],
          exemptions: null,
          isCompounding: false,
          isActive: true,
          sortOrder: 1,
          effectiveFrom: '2024-01-01',
          effectiveTo: null,
        },
        {
          id: 'rule-split-b',
          taxProfileId: 'tp-berlin',
          name: 'Split B',
          code: 'SPLIT_B',
          type: 'split_component',
          rate: '20.00',
          splitPercentage: '30.00',
          appliesToChargeTypes: ['breakfast'],
          exemptions: null,
          isCompounding: false,
          isActive: true,
          sortOrder: 2,
          effectiveFrom: '2024-01-01',
          effectiveTo: null,
        },
      ];
      const service = await makeService(buildBerlinDb(partialRules));

      const items = await service.calculateTaxes('100.00', 'breakfast', 'prop-004', '2026-04-07');

      expect(items).toHaveLength(2);
      // 10% of (100 * 50%) = 10% of 50 = 5.00
      expect(items[0]!.amount).toBe('5.00');
      // 20% of (100 * 30%) = 20% of 30 = 6.00
      expect(items[1]!.amount).toBe('6.00');
    });
  });
});
