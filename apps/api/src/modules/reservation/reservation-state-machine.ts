import { BadRequestException } from '@nestjs/common';

/**
 * Reservation status state machine (KB 5.1).
 *
 * pending → confirmed → assigned → checked_in → stayover → due_out → checked_out
 * pending → cancelled (anytime before checked_in)
 * confirmed → no_show (after arrival date passes)
 */

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'checked_in'
  | 'stayover'
  | 'due_out'
  | 'checked_out'
  | 'no_show'
  | 'cancelled';

const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['assigned', 'cancelled', 'no_show'],
  assigned: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['stayover', 'checked_out'],
  stayover: ['due_out', 'checked_out'],
  due_out: ['checked_out'],
  checked_out: [],
  no_show: [],
  cancelled: [],
};

export function validateTransition(
  current: ReservationStatus,
  target: ReservationStatus,
): boolean {
  return VALID_TRANSITIONS[current]?.includes(target) ?? false;
}

export function assertTransition(
  current: ReservationStatus,
  target: ReservationStatus,
): void {
  if (!validateTransition(current, target)) {
    throw new BadRequestException(
      `Invalid status transition: ${current} → ${target}. ` +
      `Valid transitions from '${current}': ${getValidTransitions(current).join(', ') || 'none'}`,
    );
  }
}

export function getValidTransitions(
  current: ReservationStatus,
): ReservationStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}
