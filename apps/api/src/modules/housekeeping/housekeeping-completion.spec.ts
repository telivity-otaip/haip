import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { HousekeepingService } from './housekeeping.service';
import { DRIZZLE } from '../../database/database.module';
import { WebhookService } from '../webhook/webhook.service';
import { RoomStatusService } from '../room/room-status.service';

const mockWebhookService = { emit: vi.fn().mockResolvedValue(undefined) };
const mockRoomStatusService = {
  transitionStatus: vi.fn().mockResolvedValue({ id: 'room-001', status: 'clean' }),
  getRoomStatus: vi.fn().mockResolvedValue({ id: 'room-001', number: '101', status: 'vacant_dirty' }),
  getRoomsByStatus: vi.fn().mockResolvedValue([]),
  getPropertyRoomSummary: vi.fn().mockResolvedValue([]),
};

const baseTask = {
  id: 'task-001',
  propertyId: 'prop-001',
  roomId: 'room-001',
  type: 'checkout',
  priority: 0,
  serviceDate: '2026-04-06',
  checklist: [],
  notes: null,
  maintenanceRequired: false,
  assignedTo: 'hk-001',
  assignedAt: new Date(),
  startedAt: new Date(),
  completedAt: null,
  inspectedBy: null,
  inspectedAt: null,
};

function createCompletionDb(options: {
  task?: any;
  propertySettings?: any;
} = {}) {
  const task = options.task ?? { ...baseTask, status: 'in_progress' };
  const propertySettings = options.propertySettings ?? { requireInspection: true };

  let selectCallCount = 0;
  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (resolve: any) => {
            selectCallCount++;
            // Call 1: findByIdRaw (task lookup)
            // Call 2: property settings lookup
            if (selectCallCount === 1) resolve([task]);
            else if (selectCallCount === 2) resolve([{ settings: propertySettings }]);
            // For auto-create maintenance: room lookup, reservation lookup
            else resolve([{ isAccessible: false }]);
          },
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: (resolve: any) => resolve([]),
            }),
          }),
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: (resolve: any) => resolve([]),
              }),
            }),
            then: (resolve: any) => resolve([]),
          }),
        }),
      }),
    })),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue({
          then: (resolve: any) => resolve([{ id: 'task-maint', type: 'maintenance' }]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...task, status: 'completed', completedAt: new Date() }]),
          }),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        then: (resolve: any) => resolve(undefined),
      }),
    }),
  };
}

async function createService(db: any) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      HousekeepingService,
      { provide: DRIZZLE, useValue: db },
      { provide: WebhookService, useValue: mockWebhookService },
      { provide: RoomStatusService, useValue: mockRoomStatusService },
    ],
  }).compile();

  return module.get<HousekeepingService>(HousekeepingService);
}

describe('HousekeepingService — Completion & Inspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomStatusService.getRoomStatus.mockResolvedValue({ id: 'room-001', number: '101', status: 'vacant_dirty' });
  });

  it('should complete task and set completedAt', async () => {
    const db = createCompletionDb();
    const svc = await createService(db);
    const result = await svc.completeTask('task-001', 'prop-001', {});
    expect(result.status).toBe('completed');
    const setCall = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.completedAt).toBeInstanceOf(Date);
  });

  it('should transition room to clean on completion', async () => {
    const db = createCompletionDb();
    const svc = await createService(db);
    await svc.completeTask('task-001', 'prop-001', {});
    expect(mockRoomStatusService.transitionStatus).toHaveBeenCalledWith(
      'room-001', 'prop-001', 'clean',
    );
  });

  it('should skip room transition if room already clean (re-clean after failed inspection)', async () => {
    mockRoomStatusService.getRoomStatus.mockResolvedValueOnce({ id: 'room-001', number: '101', status: 'clean' });
    const db = createCompletionDb();
    const svc = await createService(db);
    await svc.completeTask('task-001', 'prop-001', {});
    // transitionStatus should NOT be called for vacant_dirty→clean since room is already clean
    expect(mockRoomStatusService.transitionStatus).not.toHaveBeenCalledWith(
      'room-001', 'prop-001', 'clean',
    );
  });

  it('should emit housekeeping.task_completed webhook', async () => {
    const db = createCompletionDb();
    const svc = await createService(db);
    await svc.completeTask('task-001', 'prop-001', {});
    expect(mockWebhookService.emit).toHaveBeenCalledWith(
      'housekeeping.task_completed',
      'housekeeping_task',
      expect.any(String),
      expect.objectContaining({ roomId: 'room-001' }),
      'prop-001',
    );
  });

  it('should create maintenance task when maintenance flagged', async () => {
    const db = createCompletionDb();
    const svc = await createService(db);
    await svc.completeTask('task-001', 'prop-001', {
      maintenanceRequired: true,
      maintenanceNotes: 'Broken faucet',
    });
    // Verify insert was called for maintenance task
    expect(db.insert).toHaveBeenCalled();
  });

  it('should reject completion of non-in_progress task', async () => {
    const pendingTask = { ...baseTask, status: 'pending' };
    const db = createCompletionDb({ task: pendingTask });
    const svc = await createService(db);
    await expect(svc.completeTask('task-001', 'prop-001', {}))
      .rejects.toThrow("Cannot complete task in 'pending' status");
  });

  it('should go straight to inspected + guest_ready when requireInspection is false', async () => {
    const db = createCompletionDb({ propertySettings: { requireInspection: false } });
    const svc = await createService(db);
    await svc.completeTask('task-001', 'prop-001', {});
    // Should transition: clean → inspected → guest_ready
    expect(mockRoomStatusService.transitionStatus).toHaveBeenCalledWith('room-001', 'prop-001', 'clean');
    expect(mockRoomStatusService.transitionStatus).toHaveBeenCalledWith('room-001', 'prop-001', 'inspected');
    expect(mockRoomStatusService.transitionStatus).toHaveBeenCalledWith('room-001', 'prop-001', 'guest_ready');
    // Task status should be inspected
    const setCall = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.status).toBe('inspected');
  });

  it('should pass inspection and transition room to guest_ready', async () => {
    const completedTask = { ...baseTask, status: 'completed', completedAt: new Date() };
    const db = createCompletionDb({ task: completedTask });
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...completedTask, status: 'inspected' }]),
          }),
        }),
      }),
    });
    const svc = await createService(db);
    const result = await svc.inspectTask('task-001', 'prop-001', {
      inspectedBy: 'inspector-001',
      passed: true,
    });
    expect(result.status).toBe('inspected');
    expect(mockRoomStatusService.transitionStatus).toHaveBeenCalledWith('room-001', 'prop-001', 'inspected');
    expect(mockRoomStatusService.transitionStatus).toHaveBeenCalledWith('room-001', 'prop-001', 'guest_ready');
  });

  it('should fail inspection and reset task to pending', async () => {
    const completedTask = { ...baseTask, status: 'completed', completedAt: new Date() };
    const db = createCompletionDb({ task: completedTask });
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...completedTask, status: 'pending', assignedTo: null }]),
          }),
        }),
      }),
    });
    const svc = await createService(db);
    const result = await svc.inspectTask('task-001', 'prop-001', {
      inspectedBy: 'inspector-001',
      passed: false,
      notes: 'Bathroom not clean',
    });
    expect(result.status).toBe('pending');
    // Room stays at clean — no transition called
    expect(mockRoomStatusService.transitionStatus).not.toHaveBeenCalled();
  });

  it('should reject inspection of non-completed task', async () => {
    const inProgressTask = { ...baseTask, status: 'in_progress' };
    const db = createCompletionDb({ task: inProgressTask });
    const svc = await createService(db);
    await expect(svc.inspectTask('task-001', 'prop-001', {
      inspectedBy: 'inspector-001',
      passed: true,
    })).rejects.toThrow("Cannot inspect task in 'in_progress' status");
  });

  it('should skip task from pending status', async () => {
    const pendingTask = { ...baseTask, status: 'pending' };
    const db = createCompletionDb({ task: pendingTask });
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...pendingTask, status: 'skipped' }]),
          }),
        }),
      }),
    });
    const svc = await createService(db);
    const result = await svc.skipTask('task-001', 'prop-001', 'Guest declined');
    expect(result.status).toBe('skipped');
  });

  it('should reject skip of in_progress task', async () => {
    const inProgressTask = { ...baseTask, status: 'in_progress' };
    const db = createCompletionDb({ task: inProgressTask });
    const svc = await createService(db);
    await expect(svc.skipTask('task-001', 'prop-001', 'Guest declined'))
      .rejects.toThrow("Cannot skip task in 'in_progress' status");
  });
});
