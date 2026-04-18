import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FolioRoutingService } from './folio-routing.service';
import { FolioService } from './folio.service';
import { DRIZZLE } from '../../database/database.module';

const mockFolio = {
  id: 'folio-001',
  propertyId: 'prop-001',
  reservationId: 'res-001',
  guestId: 'guest-001',
  folioNumber: 'F-260405-0001',
  type: 'guest',
  status: 'open',
  totalCharges: '0.00',
  totalPayments: '0.00',
  balance: '300.00',
  currencyCode: 'USD',
};

const mockReservation = {
  id: 'res-001',
  propertyId: 'prop-001',
  preferences: {
    routing: {
      room: 'folio-company',
      tax: 'folio-company',
      food_beverage: 'folio-001',
      default: 'folio-001',
    },
  },
};

const mockCharge = {
  id: 'charge-001',
  folioId: 'folio-001',
  type: 'room',
  amount: '150.00',
};

const mockFolioService = {
  findById: vi.fn().mockResolvedValue(mockFolio),
  create: vi.fn().mockResolvedValue({ ...mockFolio, id: 'folio-cl-001', type: 'city_ledger' }),
  postCharge: vi.fn().mockResolvedValue(mockCharge),
  recalculateBalance: vi.fn(),
};

function createMockDb(returnData: any[] = [mockReservation]) {
  const db: any = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (resolve: any) => resolve(returnData),
        }),
      }),
    })),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn(),
  };
  db.transaction = (cb: any) => cb(db);
  return db;
}

describe('FolioRoutingService', () => {
  let service: FolioRoutingService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolioRoutingService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: FolioService, useValue: mockFolioService },
      ],
    }).compile();

    service = module.get<FolioRoutingService>(FolioRoutingService);
  });

  describe('routeCharge', () => {
    it('should route charge to correct folio per routing rules', async () => {
      const chargeDto = {
        propertyId: 'prop-001',
        type: 'room',
        description: 'Room tariff',
        amount: '150.00',
        currencyCode: 'USD',
        serviceDate: '2026-04-05',
      };

      await service.routeCharge('res-001', 'prop-001', 'room', chargeDto);

      // Room charges should go to 'folio-company' per routing rules
      expect(mockFolioService.postCharge).toHaveBeenCalledWith(
        'folio-company',
        chargeDto,
      );
    });

    it('should use default folio when no routing rule matches', async () => {
      const noRoutingReservation = {
        ...mockReservation,
        preferences: {},
      };
      const db = {
        ...createMockDb([noRoutingReservation]),
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              // First call: reservation, second call: findDefaultFolio
              then: (resolve: any) => resolve([noRoutingReservation]),
            }),
          }),
        })),
      };
      // Override select to return folio on second call
      let callCount = 0;
      db.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (resolve: any) => {
              callCount++;
              if (callCount === 1) resolve([noRoutingReservation]);
              else resolve([mockFolio]);
            },
          }),
        }),
      }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FolioRoutingService,
          { provide: DRIZZLE, useValue: db },
          { provide: FolioService, useValue: mockFolioService },
        ],
      }).compile();
      const svc = module.get<FolioRoutingService>(FolioRoutingService);

      const chargeDto = {
        propertyId: 'prop-001',
        type: 'minibar',
        description: 'Minibar',
        amount: '25.00',
        currencyCode: 'USD',
        serviceDate: '2026-04-05',
      };

      await svc.routeCharge('res-001', 'prop-001', 'minibar', chargeDto);

      expect(mockFolioService.postCharge).toHaveBeenCalledWith(
        mockFolio.id,
        chargeDto,
      );
    });
  });

  describe('findDefaultFolio', () => {
    it('should return the primary guest folio for a reservation', async () => {
      const folioDb = createMockDb([mockFolio]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FolioRoutingService,
          { provide: DRIZZLE, useValue: folioDb },
          { provide: FolioService, useValue: mockFolioService },
        ],
      }).compile();
      const svc = module.get<FolioRoutingService>(FolioRoutingService);

      const result = await svc.findDefaultFolio('res-001', 'prop-001');
      expect(result.type).toBe('guest');
      expect(result.reservationId).toBe('res-001');
    });

    it('should throw NotFoundException when no guest folio exists', async () => {
      const emptyDb = createMockDb([]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FolioRoutingService,
          { provide: DRIZZLE, useValue: emptyDb },
          { provide: FolioService, useValue: mockFolioService },
        ],
      }).compile();
      const svc = module.get<FolioRoutingService>(FolioRoutingService);

      await expect(svc.findDefaultFolio('res-001', 'prop-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transferToCityLedger', () => {
    it('should create city ledger folio and record payment on source', async () => {
      const result = await service.transferToCityLedger('folio-001', 'prop-001', {
        companyName: 'Acme Corp',
        paymentTermsDays: 'NET30',
      });

      expect(mockFolioService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'city_ledger',
          companyName: 'Acme Corp',
          paymentTermsDays: 'NET30',
        }),
        expect.anything(), // Bug 3: now called inside db.transaction with tx
      );
      expect(result.transferredAmount).toBe('300.00');
      expect(result.cityLedgerFolioId).toBe('folio-cl-001');
    });
  });
});
