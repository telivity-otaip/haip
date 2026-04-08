import { describe, it, expect } from 'vitest';
import {
  mapAvailabilityToOta,
  mapRatesToOta,
  mapRestrictionsToOta,
  mapOtaReservationToHaip,
  buildReservationConfirmation,
} from './booking-com.mapper';

describe('BookingCom Mapper', () => {
  describe('mapAvailabilityToOta', () => {
    it('should map HAIP availability items to OTA XML payload', () => {
      const items = [
        { channelRoomCode: 'DLXK', date: '2026-04-15', available: 5, totalInventory: 10 },
        { channelRoomCode: 'DLXK', date: '2026-04-16', available: 3, totalInventory: 10 },
        { channelRoomCode: 'STDT', date: '2026-04-15', available: 8, totalInventory: 15 },
      ];

      const result = mapAvailabilityToOta('HOTEL1', items);
      const messages = result['AvailStatusMessages'] as any;

      expect(messages['@_HotelCode']).toBe('HOTEL1');
      expect(messages.AvailStatusMessage).toHaveLength(3);
      expect(messages.AvailStatusMessage[0]['@_BookingLimit']).toBe(5);
      expect(messages.AvailStatusMessage[0].StatusApplicationControl['@_InvTypeCode']).toBe('DLXK');
    });

    it('should set zero availability for sold-out rooms', () => {
      const items = [
        { channelRoomCode: 'DLXK', date: '2026-04-15', available: 0, totalInventory: 10 },
      ];

      const result = mapAvailabilityToOta('HOTEL1', items);
      const messages = result['AvailStatusMessages'] as any;
      expect(messages.AvailStatusMessage[0]['@_BookingLimit']).toBe(0);
    });
  });

  describe('mapRatesToOta', () => {
    it('should map HAIP rate items to OTA XML payload', () => {
      const items = [
        {
          channelRoomCode: 'DLXK',
          channelRateCode: 'BAR',
          date: '2026-04-15',
          amount: 199.99,
          currencyCode: 'USD',
        },
      ];

      const result = mapRatesToOta('HOTEL1', items);
      const messages = result['RateAmountMessages'] as any;

      expect(messages['@_HotelCode']).toBe('HOTEL1');
      expect(messages.RateAmountMessage).toHaveLength(1);

      const msg = messages.RateAmountMessage[0];
      expect(msg.StatusApplicationControl['@_RatePlanCode']).toBe('BAR');
      expect(msg.Rates.Rate.BaseByGuestAmts.BaseByGuestAmt['@_AmountAfterTax']).toBe(199.99);
      expect(msg.Rates.Rate.BaseByGuestAmts.BaseByGuestAmt['@_CurrencyCode']).toBe('USD');
    });
  });

  describe('mapRestrictionsToOta', () => {
    it('should map HAIP restriction items to OTA XML payload', () => {
      const items = [
        {
          channelRoomCode: 'DLXK',
          channelRateCode: 'BAR',
          date: '2026-04-15',
          stopSell: false,
          closedToArrival: true,
          closedToDeparture: false,
          minLos: 2,
          maxLos: 14,
        },
      ];

      const result = mapRestrictionsToOta('HOTEL1', items);
      const messages = result['RateAmountMessages'] as any;

      const msg = messages.RateAmountMessage[0];
      expect(msg.Rates.Rate['@_MinLOS']).toBe(2);
      expect(msg.Rates.Rate['@_MaxLOS']).toBe(14);
      expect(msg.Rates.Rate.HotelRef['@_CTA']).toBe(true);
      expect(msg.Rates.Rate.HotelRef['@_CTD']).toBe(false);
      expect(msg.Rates.Rate.HotelRef['@_StopSell']).toBe(false);
    });

    it('should default MinLOS to 1 and MaxLOS to 999 when not provided', () => {
      const items = [
        {
          channelRoomCode: 'STDT',
          channelRateCode: 'BAR',
          date: '2026-04-15',
          stopSell: false,
          closedToArrival: false,
          closedToDeparture: false,
        },
      ];

      const result = mapRestrictionsToOta('HOTEL1', items);
      const msg = (result['RateAmountMessages'] as any).RateAmountMessage[0];
      expect(msg.Rates.Rate['@_MinLOS']).toBe(1);
      expect(msg.Rates.Rate['@_MaxLOS']).toBe(999);
    });
  });

  describe('mapOtaReservationToHaip', () => {
    const sampleData = {
      HotelReservations: {
        HotelReservation: {
          '@_ResStatus': 'Commit',
          '@_CreateDateTime': '2026-04-01T10:00:00Z',
          UniqueID: { '@_Type': 14, '@_ID': 'BDC-12345678' },
          RoomStays: {
            RoomStay: {
              RoomTypes: { RoomType: { '@_RoomTypeCode': 'DLXK' } },
              RatePlans: { RatePlan: { '@_RatePlanCode': 'BAR' } },
              GuestCounts: {
                GuestCount: [
                  { '@_AgeQualifyingCode': 10, '@_Count': 2 },
                  { '@_AgeQualifyingCode': 8, '@_Count': 1 },
                ],
              },
              TimeSpan: { '@_Start': '2026-04-15', '@_End': '2026-04-18' },
              Total: { '@_AmountAfterTax': '450.00', '@_CurrencyCode': 'USD' },
            },
          },
          ResGuests: {
            ResGuest: {
              Profiles: {
                ProfileInfo: {
                  Profile: {
                    Customer: {
                      PersonName: { GivenName: 'John', Surname: 'Doe' },
                      Email: 'john.doe@example.com',
                      Telephone: { '@_PhoneNumber': '+1-555-0123' },
                    },
                  },
                },
              },
            },
          },
          SpecialRequests: {
            SpecialRequest: { Text: 'Late check-in after 10 PM' },
          },
        },
      },
    };

    it('should map OTA reservation to HAIP format', () => {
      const reservations = mapOtaReservationToHaip(sampleData);

      expect(reservations).toHaveLength(1);
      const res = reservations[0]!;

      expect(res.externalConfirmation).toBe('BDC-12345678');
      expect(res.channelCode).toBe('booking_com');
      expect(res.guestFirstName).toBe('John');
      expect(res.guestLastName).toBe('Doe');
      expect(res.guestEmail).toBe('john.doe@example.com');
      expect(res.guestPhone).toBe('+1-555-0123');
      expect(res.channelRoomCode).toBe('DLXK');
      expect(res.channelRateCode).toBe('BAR');
      expect(res.arrivalDate).toBe('2026-04-15');
      expect(res.departureDate).toBe('2026-04-18');
      expect(res.adults).toBe(2);
      expect(res.children).toBe(1);
      expect(res.totalAmount).toBe(450);
      expect(res.currencyCode).toBe('USD');
      expect(res.specialRequests).toBe('Late check-in after 10 PM');
      expect(res.status).toBe('new');
    });

    it('should map cancelled reservation', () => {
      const cancelData = {
        HotelReservations: {
          HotelReservation: {
            ...sampleData.HotelReservations.HotelReservation,
            '@_ResStatus': 'Cancel',
          },
        },
      };

      const reservations = mapOtaReservationToHaip(cancelData);
      expect(reservations[0]!.status).toBe('cancelled');
    });

    it('should map modified reservation', () => {
      const modData = {
        HotelReservations: {
          HotelReservation: {
            ...sampleData.HotelReservations.HotelReservation,
            '@_ResStatus': 'Modify',
          },
        },
      };

      const reservations = mapOtaReservationToHaip(modData);
      expect(reservations[0]!.status).toBe('modified');
    });

    it('should handle empty reservation data', () => {
      const result = mapOtaReservationToHaip({});
      expect(result).toHaveLength(0);
    });

    it('should handle multiple reservations', () => {
      const multiData = {
        HotelReservations: {
          HotelReservation: [
            sampleData.HotelReservations.HotelReservation,
            {
              ...sampleData.HotelReservations.HotelReservation,
              UniqueID: { '@_Type': 14, '@_ID': 'BDC-87654321' },
            },
          ],
        },
      };

      const result = mapOtaReservationToHaip(multiData);
      expect(result).toHaveLength(2);
      expect(result[0]!.externalConfirmation).toBe('BDC-12345678');
      expect(result[1]!.externalConfirmation).toBe('BDC-87654321');
    });
  });

  describe('buildReservationConfirmation', () => {
    it('should build confirmation payload with correct IDs', () => {
      const result = buildReservationConfirmation('BDC-12345678', 'CH-ABC-XYZ');

      expect(result).toHaveProperty('Success');
      expect(result).toHaveProperty('HotelReservations');

      const hotelRes = (result as any).HotelReservations.HotelReservation;
      expect(hotelRes['@_ResStatus']).toBe('Commit');
      expect(hotelRes.UniqueID['@_ID']).toBe('BDC-12345678');
      expect(hotelRes.ResGlobalInfo.HotelReservationIDs.HotelReservationID['@_ResID_Value']).toBe('CH-ABC-XYZ');
    });
  });
});
