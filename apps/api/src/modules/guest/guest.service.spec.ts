import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuestService } from './guest.service';
import { DRIZZLE } from '../../database/database.module';

const mockGuest = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@example.com',
  phone: '+1-555-0100',
  vipLevel: 'gold',
  isDnr: false,
  dnrReason: null,
  dnrDate: null,
  loyaltyNumber: 'LY12345',
  preferences: { bedType: 'king' },
  gdprConsentMarketing: false,
  gdprConsentDate: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Drizzle query chains:
 * - select().from().where() → Promise<row[]>  (select queries)
 * - select().from().where().limit().offset().orderBy() → Promise<row[]>  (paginated)
 * - insert().values().returning() → Promise<row[]>
 * - update().set().where().returning() → Promise<row[]>
 * - delete().where().returning() → Promise<row[]>
 * - select({count}).from().where() → Promise<[{count}]>
 */
function createMockDb(returnData: any[] = [mockGuest]) {
  // For select queries, the terminal method is where() or orderBy()
  const selectChain = () => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        // For paginated queries
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(returnData),
          }),
        }),
        // Direct where() resolves to rows (for findById)
        then: (resolve: any) => resolve(returnData),
      }),
    }),
  });

  const mutateChain = () => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(returnData),
    }),
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(returnData),
      }),
    }),
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(returnData),
    }),
  });

  return {
    select: vi.fn().mockImplementation(selectChain),
    insert: vi.fn().mockReturnValue(mutateChain()),
    update: vi.fn().mockReturnValue(mutateChain()),
    delete: vi.fn().mockReturnValue(mutateChain()),
  };
}

describe('GuestService', () => {
  let service: GuestService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<GuestService>(GuestService);
  });

  describe('create', () => {
    it('should create a guest and return it', async () => {
      const result = await service.create({
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
      });

      expect(result).toEqual(mockGuest);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a guest when found', async () => {
      const result = await service.findById(mockGuest.id);
      expect(result).toEqual(mockGuest);
    });

    it('should throw NotFoundException when guest not found', async () => {
      const emptyDb = createMockDb([]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GuestService,
          { provide: DRIZZLE, useValue: emptyDb },
        ],
      }).compile();
      const svc = module.get<GuestService>(GuestService);

      await expect(svc.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the guest', async () => {
      const result = await service.update(mockGuest.id, {
        firstName: 'Jane',
      });

      expect(result).toEqual(mockGuest);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when guest not found', async () => {
      const emptyDb = createMockDb([]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GuestService,
          { provide: DRIZZLE, useValue: emptyDb },
        ],
      }).compile();
      const svc = module.get<GuestService>(GuestService);

      await expect(
        svc.update('nonexistent', { firstName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete the guest', async () => {
      const result = await service.delete(mockGuest.id);
      expect(result).toEqual({ deleted: true });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when guest not found', async () => {
      const emptyDb = createMockDb([]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GuestService,
          { provide: DRIZZLE, useValue: emptyDb },
        ],
      }).compile();
      const svc = module.get<GuestService>(GuestService);

      await expect(svc.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should return paginated results', async () => {
      // Mock both the data query and count query
      const countChain = () => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ count: 1 }]),
          }),
        }),
      });

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Data query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([mockGuest]),
                  }),
                }),
                then: (resolve: any) => resolve([mockGuest]),
              }),
            }),
          };
        }
        // Count query
        return countChain();
      });

      const result = await service.search({ page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
    });
  });
});
