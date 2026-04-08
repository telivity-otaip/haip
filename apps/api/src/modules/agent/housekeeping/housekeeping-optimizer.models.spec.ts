import { describe, it, expect } from 'vitest';
import {
  estimateCleaningTime,
  calculateRouteEfficiency,
  sortRoomsForCleaning,
  assignRoomsToStaff,
  type RoomTask,
} from './housekeeping-optimizer.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoom(overrides: Partial<RoomTask> = {}): RoomTask {
  return {
    taskId: 'task-1',
    roomId: 'room-1',
    roomNumber: '101',
    floor: 1,
    building: 'main',
    roomTypeId: 'rt-1',
    taskType: 'checkout',
    priority: 0,
    isVip: false,
    isEarlyCheckIn: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// estimateCleaningTime
// ---------------------------------------------------------------------------

describe('estimateCleaningTime', () => {
  it('returns stayover time for stayover tasks', () => {
    expect(estimateCleaningTime('stayover')).toBe(20);
  });

  it('returns deep_clean time', () => {
    expect(estimateCleaningTime('deep_clean')).toBe(60);
  });

  it('returns standard time for checkout', () => {
    expect(estimateCleaningTime('checkout')).toBe(30);
  });

  it('returns inspection time', () => {
    expect(estimateCleaningTime('inspection')).toBe(10);
  });

  it('uses custom config', () => {
    expect(estimateCleaningTime('stayover', { standard: 25, suite: 40, stayover: 15, deep_clean: 50 })).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// calculateRouteEfficiency
// ---------------------------------------------------------------------------

describe('calculateRouteEfficiency', () => {
  it('returns 1.0 for all rooms on same floor', () => {
    const rooms = [makeRoom({ floor: 2 }), makeRoom({ floor: 2 }), makeRoom({ floor: 2 })];
    expect(calculateRouteEfficiency(rooms)).toBe(1.0);
  });

  it('returns lower score for floor changes', () => {
    const rooms = [makeRoom({ floor: 1 }), makeRoom({ floor: 2 }), makeRoom({ floor: 3 })];
    expect(calculateRouteEfficiency(rooms)).toBeLessThan(1.0);
  });

  it('returns 1.0 for single room', () => {
    expect(calculateRouteEfficiency([makeRoom()])).toBe(1.0);
  });

  it('returns 1.0 for empty array', () => {
    expect(calculateRouteEfficiency([])).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// sortRoomsForCleaning
// ---------------------------------------------------------------------------

describe('sortRoomsForCleaning', () => {
  it('puts VIP rooms first', () => {
    const rooms = [
      makeRoom({ roomNumber: '102', isVip: false }),
      makeRoom({ roomNumber: '101', isVip: true }),
    ];
    const sorted = sortRoomsForCleaning(rooms);
    expect(sorted[0]!.isVip).toBe(true);
  });

  it('puts early check-in rooms before others', () => {
    const rooms = [
      makeRoom({ roomNumber: '102', isEarlyCheckIn: false }),
      makeRoom({ roomNumber: '101', isEarlyCheckIn: true }),
    ];
    const sorted = sortRoomsForCleaning(rooms);
    expect(sorted[0]!.isEarlyCheckIn).toBe(true);
  });

  it('puts checkout before stayover when enabled', () => {
    const rooms = [
      makeRoom({ taskType: 'stayover', roomNumber: '101' }),
      makeRoom({ taskType: 'checkout', roomNumber: '102' }),
    ];
    const sorted = sortRoomsForCleaning(rooms, true);
    expect(sorted[0]!.taskType).toBe('checkout');
  });

  it('groups by floor then room number', () => {
    const rooms = [
      makeRoom({ floor: 2, roomNumber: '202' }),
      makeRoom({ floor: 1, roomNumber: '102' }),
      makeRoom({ floor: 1, roomNumber: '101' }),
    ];
    const sorted = sortRoomsForCleaning(rooms);
    expect(sorted.map((r) => r.roomNumber)).toEqual(['101', '102', '202']);
  });
});

// ---------------------------------------------------------------------------
// assignRoomsToStaff
// ---------------------------------------------------------------------------

describe('assignRoomsToStaff', () => {
  it('distributes rooms evenly among staff', () => {
    const rooms = Array.from({ length: 8 }, (_, i) =>
      makeRoom({ taskId: `t-${i}`, roomId: `r-${i}`, roomNumber: `${101 + i}` }),
    );
    const result = assignRoomsToStaff(rooms, ['s1', 's2'], ['Alice', 'Bob']);
    expect(result[0]!.assignedRooms.length).toBe(4);
    expect(result[1]!.assignedRooms.length).toBe(4);
  });

  it('handles more staff than rooms', () => {
    const rooms = [makeRoom()];
    const result = assignRoomsToStaff(rooms, ['s1', 's2', 's3'], ['A', 'B', 'C']);
    const withRooms = result.filter((a) => a.assignedRooms.length > 0);
    expect(withRooms.length).toBe(1);
  });

  it('returns empty assignments for zero rooms', () => {
    const result = assignRoomsToStaff([], ['s1'], ['Alice']);
    expect(result[0]!.assignedRooms.length).toBe(0);
    expect(result[0]!.estimatedMinutes).toBe(0);
  });

  it('returns empty for zero staff', () => {
    const result = assignRoomsToStaff([makeRoom()], [], []);
    expect(result.length).toBe(0);
  });

  it('calculates estimated completion time', () => {
    const rooms = [makeRoom({ taskType: 'checkout' }), makeRoom({ taskType: 'checkout' })];
    const result = assignRoomsToStaff(rooms, ['s1'], ['Alice'], undefined, '08:00');
    // 2 rooms × 30min = 60min → 09:00
    expect(result[0]!.estimatedCompletionTime).toBe('09:00');
  });

  it('calculates route efficiency score', () => {
    const rooms = [
      makeRoom({ taskId: 't1', roomId: 'r1', floor: 1 }),
      makeRoom({ taskId: 't2', roomId: 'r2', floor: 1 }),
    ];
    const result = assignRoomsToStaff(rooms, ['s1'], ['Alice']);
    expect(result[0]!.routeEfficiencyScore).toBe(1.0);
  });
});
