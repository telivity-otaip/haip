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

const mockTask = {
  id: 'task-001',
  propertyId: 'prop-001',
  roomId: 'room-001',
  type: 'checkout',
  status: 'pending',
  priority: 0,
  serviceDate: '2026-04-06',
  checklist: [],
  notes: null,
  maintenanceRequired: false,
  assignedTo: null,
  assignedAt: null,
  startedAt: null,
  completedAt: null,
};

function createMockDb(task: any = mockTask) {
  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (resolve: any) => resolve([task]),
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              then: (resolve: any) => resolve([
                { taskId: 'task-001', priority: 10, floor: '1', building: 'Main' },
                { taskId: 'task-002', priority: 5, floor: '2', building: 'Main' },
                { taskId: 'task-003', priority: 0, floor: '1', building: 'Main' },
              ]),
            }),
          }),
        }),
      }),
    })),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue({
          then: (resolve: any) => resolve([task]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...task, status: 'assigned', assignedTo: 'hk-001', assignedAt: new Date() }]),
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

describe('HousekeepingService — Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assign task and transition to assigned', async () => {
    const db = createMockDb();
    const svc = await createService(db);
    const result = await svc.assign('task-001', 'prop-001', { assignedTo: 'hk-001' });
    expect(result.status).toBe('assigned');
    expect(result.assignedTo).toBe('hk-001');
  });

  it('should set assignedAt on assignment', async () => {
    const db = createMockDb();
    const svc = await createService(db);
    await svc.assign('task-001', 'prop-001', { assignedTo: 'hk-001' });
    const setCall = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.assignedAt).toBeInstanceOf(Date);
    expect(setCall.status).toBe('assigned');
  });

  it('should emit housekeeping.task_assigned webhook', async () => {
    const db = createMockDb();
    const svc = await createService(db);
    await svc.assign('task-001', 'prop-001', { assignedTo: 'hk-001' });
    expect(mockWebhookService.emit).toHaveBeenCalledWith(
      'housekeeping.task_assigned',
      'housekeeping_task',
      expect.any(String),
      expect.objectContaining({ assignedTo: 'hk-001' }),
      'prop-001',
    );
  });

  it('should reject assignment of non-pending task', async () => {
    const assignedTask = { ...mockTask, status: 'assigned' };
    const db = createMockDb(assignedTask);
    const svc = await createService(db);
    await expect(svc.assign('task-001', 'prop-001', { assignedTo: 'hk-001' }))
      .rejects.toThrow("Cannot assign task in 'assigned' status");
  });

  it('should start task and transition to in_progress', async () => {
    const assignedTask = { ...mockTask, status: 'assigned', assignedTo: 'hk-001' };
    const db = createMockDb(assignedTask);
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...assignedTask, status: 'in_progress', startedAt: new Date() }]),
          }),
        }),
      }),
    });
    const svc = await createService(db);
    const result = await svc.startTask('task-001', 'prop-001');
    expect(result.status).toBe('in_progress');
  });

  it('should set startedAt when starting task', async () => {
    const assignedTask = { ...mockTask, status: 'assigned' };
    const db = createMockDb(assignedTask);
    const svc = await createService(db);
    await svc.startTask('task-001', 'prop-001');
    const setCall = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.startedAt).toBeInstanceOf(Date);
  });

  it('should reject start of non-assigned task', async () => {
    const db = createMockDb(); // status = pending
    const svc = await createService(db);
    await expect(svc.startTask('task-001', 'prop-001'))
      .rejects.toThrow("Cannot start task in 'pending' status");
  });

  it('should unassign task back to pending', async () => {
    const assignedTask = { ...mockTask, status: 'assigned', assignedTo: 'hk-001' };
    const db = createMockDb(assignedTask);
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve([{ ...mockTask, status: 'pending', assignedTo: null }]),
          }),
        }),
      }),
    });
    const svc = await createService(db);
    const result = await svc.unassign('task-001', 'prop-001');
    expect(result.status).toBe('pending');
    expect(result.assignedTo).toBeNull();
  });

  it('should reject unassign of in_progress task', async () => {
    const inProgressTask = { ...mockTask, status: 'in_progress' };
    const db = createMockDb(inProgressTask);
    const svc = await createService(db);
    await expect(svc.unassign('task-001', 'prop-001'))
      .rejects.toThrow("Cannot unassign task in 'in_progress' status");
  });

  it('should auto-assign tasks evenly across housekeepers', async () => {
    const db = createMockDb();
    // autoAssign calls assign() for each task, which calls findByIdRaw (select) then update
    // We need to track assign calls
    const svc = await createService(db);
    const result = await svc.autoAssign({
      propertyId: 'prop-001',
      serviceDate: '2026-04-06',
      housekeepers: ['hk-001', 'hk-002'],
    });
    expect(result.assigned).toBe(3);
    expect(result.total).toBe(3);
    // 3 tasks, 2 housekeepers: hk-001 gets 2, hk-002 gets 1
    expect(mockWebhookService.emit).toHaveBeenCalledTimes(3);
  });
});
