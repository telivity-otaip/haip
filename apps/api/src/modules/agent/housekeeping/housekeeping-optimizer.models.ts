/**
 * Housekeeping optimization models.
 * Heuristic (day 1): sort by floor, divide evenly.
 * Learned (month 3+): per-staff, per-room-type cleaning time profiles.
 */

export interface RoomTask {
  taskId: string;
  roomId: string;
  roomNumber: string;
  floor: number;
  building: string;
  roomTypeId: string;
  taskType: string; // checkout, stayover, deep_clean, etc.
  priority: number;
  isVip: boolean;
  isEarlyCheckIn: boolean;
}

export interface StaffAssignment {
  staffId: string;
  staffName: string;
  assignedRooms: RoomTask[];
  estimatedMinutes: number;
  estimatedCompletionTime: string;
  routeEfficiencyScore: number;
}

export interface CleaningTimeConfig {
  standard: number;
  suite: number;
  stayover: number;
  deep_clean: number;
  [key: string]: number;
}

const DEFAULT_CLEANING_TIMES: CleaningTimeConfig = {
  standard: 30,
  suite: 45,
  stayover: 20,
  deep_clean: 60,
};

/**
 * Estimate cleaning time for a room task.
 */
export function estimateCleaningTime(
  taskType: string,
  config: CleaningTimeConfig = DEFAULT_CLEANING_TIMES,
): number {
  if (taskType === 'stayover') return config.stayover;
  if (taskType === 'deep_clean') return config.deep_clean;
  if (taskType === 'inspection') return 10;
  return config.standard;
}

/**
 * Calculate route efficiency score based on floor grouping.
 * Score 1.0 = all rooms on same floor; lower = more floor changes.
 */
export function calculateRouteEfficiency(rooms: RoomTask[]): number {
  if (rooms.length <= 1) return 1.0;

  let floorChanges = 0;
  for (let i = 1; i < rooms.length; i++) {
    if (rooms[i]!.floor !== rooms[i - 1]!.floor) floorChanges++;
  }

  return Math.max(0, 1 - floorChanges / (rooms.length - 1));
}

/**
 * Sort rooms for optimal cleaning order:
 * 1. Priority rooms first (VIP, early check-in)
 * 2. Checkout before stayover
 * 3. Group by floor
 * 4. Order by room number within floor
 */
export function sortRoomsForCleaning(rooms: RoomTask[], priorityCheckoutFirst = true): RoomTask[] {
  return [...rooms].sort((a, b) => {
    // VIP/early check-in first
    if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
    if (a.isEarlyCheckIn !== b.isEarlyCheckIn) return a.isEarlyCheckIn ? -1 : 1;

    // Priority (higher first)
    if (a.priority !== b.priority) return b.priority - a.priority;

    // Checkout before stayover
    if (priorityCheckoutFirst) {
      const aIsCheckout = a.taskType === 'checkout';
      const bIsCheckout = b.taskType === 'checkout';
      if (aIsCheckout !== bIsCheckout) return aIsCheckout ? -1 : 1;
    }

    // Same floor, then by room number
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });
}

/**
 * Assign rooms to staff with balanced workload.
 * Uses round-robin by estimated minutes, grouping by floor when possible.
 */
export function assignRoomsToStaff(
  rooms: RoomTask[],
  staffIds: string[],
  staffNames: string[],
  cleaningConfig: CleaningTimeConfig = DEFAULT_CLEANING_TIMES,
  startTime = '08:00',
): StaffAssignment[] {
  if (staffIds.length === 0 || rooms.length === 0) {
    return staffIds.map((id, i) => ({
      staffId: id,
      staffName: staffNames[i] ?? `Staff ${i + 1}`,
      assignedRooms: [],
      estimatedMinutes: 0,
      estimatedCompletionTime: startTime,
      routeEfficiencyScore: 1.0,
    }));
  }

  const sorted = sortRoomsForCleaning(rooms);

  // Initialize assignments
  const assignments: StaffAssignment[] = staffIds.map((id, i) => ({
    staffId: id,
    staffName: staffNames[i] ?? `Staff ${i + 1}`,
    assignedRooms: [],
    estimatedMinutes: 0,
    estimatedCompletionTime: '',
    routeEfficiencyScore: 0,
  }));

  // Assign rooms to staff with least load
  for (const room of sorted) {
    const minutes = estimateCleaningTime(room.taskType, cleaningConfig);

    // Find staff with least workload
    let minIdx = 0;
    for (let i = 1; i < assignments.length; i++) {
      if (assignments[i]!.estimatedMinutes < assignments[minIdx]!.estimatedMinutes) {
        minIdx = i;
      }
    }

    assignments[minIdx]!.assignedRooms.push(room);
    assignments[minIdx]!.estimatedMinutes += minutes;
  }

  // Calculate completion times and route efficiency
  const [startHour, startMin] = startTime.split(':').map(Number) as [number, number];
  for (const assignment of assignments) {
    const totalMinutes = startHour * 60 + startMin + assignment.estimatedMinutes;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;
    assignment.estimatedCompletionTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
    assignment.routeEfficiencyScore = calculateRouteEfficiency(assignment.assignedRooms);
  }

  return assignments;
}
