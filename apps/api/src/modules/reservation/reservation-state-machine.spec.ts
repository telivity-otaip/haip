import { BadRequestException } from '@nestjs/common';
import {
  validateTransition,
  assertTransition,
  getValidTransitions,
  type ReservationStatus,
} from './reservation-state-machine';

describe('ReservationStateMachine', () => {
  describe('validateTransition', () => {
    const validTransitions: [ReservationStatus, ReservationStatus][] = [
      ['pending', 'confirmed'],
      ['pending', 'cancelled'],
      ['confirmed', 'assigned'],
      ['confirmed', 'cancelled'],
      ['confirmed', 'no_show'],
      ['assigned', 'checked_in'],
      ['assigned', 'cancelled'],
      ['assigned', 'no_show'],
      ['checked_in', 'stayover'],
      ['checked_in', 'checked_out'],
      ['stayover', 'due_out'],
      ['stayover', 'checked_out'],
      ['due_out', 'checked_out'],
    ];

    it.each(validTransitions)(
      'should allow %s → %s',
      (from, to) => {
        expect(validateTransition(from, to)).toBe(true);
      },
    );

    const invalidTransitions: [ReservationStatus, ReservationStatus][] = [
      ['pending', 'checked_in'],
      ['pending', 'checked_out'],
      ['pending', 'no_show'],
      ['pending', 'assigned'],
      ['confirmed', 'checked_in'],
      ['confirmed', 'checked_out'],
      ['assigned', 'confirmed'],
      ['checked_in', 'cancelled'],
      ['checked_in', 'no_show'],
      ['checked_in', 'assigned'],
      ['checked_out', 'checked_in'],
      ['checked_out', 'cancelled'],
      ['cancelled', 'confirmed'],
      ['cancelled', 'pending'],
      ['no_show', 'confirmed'],
      ['no_show', 'checked_in'],
      ['due_out', 'cancelled'],
      ['stayover', 'cancelled'],
    ];

    it.each(invalidTransitions)(
      'should reject %s → %s',
      (from, to) => {
        expect(validateTransition(from, to)).toBe(false);
      },
    );
  });

  describe('assertTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => assertTransition('pending', 'confirmed')).not.toThrow();
    });

    it('should throw BadRequestException for invalid transition', () => {
      expect(() => assertTransition('pending', 'checked_in')).toThrow(
        BadRequestException,
      );
    });

    it('should include valid transitions in error message', () => {
      try {
        assertTransition('pending', 'checked_in');
      } catch (e: any) {
        expect(e.message).toContain('confirmed');
        expect(e.message).toContain('cancelled');
      }
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for pending', () => {
      expect(getValidTransitions('pending')).toEqual(['confirmed', 'cancelled']);
    });

    it('should return empty array for terminal states', () => {
      expect(getValidTransitions('checked_out')).toEqual([]);
      expect(getValidTransitions('cancelled')).toEqual([]);
      expect(getValidTransitions('no_show')).toEqual([]);
    });

    it('should return multiple transitions for confirmed', () => {
      const transitions = getValidTransitions('confirmed');
      expect(transitions).toContain('assigned');
      expect(transitions).toContain('cancelled');
      expect(transitions).toContain('no_show');
    });
  });
});
