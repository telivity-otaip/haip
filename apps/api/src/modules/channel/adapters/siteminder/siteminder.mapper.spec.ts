import { describe, it, expect } from 'vitest';
import {
  mapAvailabilityToOta,
  mapRatesToOta,
  mapSiteMinderReservationToHaip,
  buildNotifConfirmation,
} from './siteminder.mapper';

describe('SiteMinder Mapper', () => {
  describe('mapAvailabilityToOta', () => {
    it('should map availability items with hotel code', () => {
      const items = [
        { channelRoomCode: 'SGLK', date: '2026-04-15', available: 5, totalInventory: 10 },
        { channelRoomCode: 'DBLK', date: '2026-04-15', available: 3, totalInventory: 8 },
      ];

      const result = mapAvailabilityToOta('SM_H1', items);
      const messages = result['AvailStatusMessages'] as any;

      expect(messages['@_HotelCode']).toBe('SM_H1');
      expect(messages.AvailStatusMessage).toHaveLength(2);
      expect(messages.AvailStatusMessage[0]['@_BookingLimit']).toBe(5);
    });

    it('should combine availability with restrictions', () => {
      const items = [
        { channelRoomCode: 'SGLK', date: '2026-04-15', available: 5, totalInventory: 10 },
      ];
      const restrictions = [
        {
          channelRoomCode: 'SGLK',
          channelRateCode: 'BAR',
          date: '2026-04-15',
          stopSell: false,
          closedToArrival: true,
          closedToDeparture: false,
          minLos: 2,
          maxLos: 7,
        },
      ];

      const result = mapAvailabilityToOta('SM_H1', items, restrictions);
      const msg = (result['AvailStatusMessages'] as any).AvailStatusMessage[0];

      expect(msg.LengthsOfStay).toBeDefined();
      expect(msg.LengthsOfStay.LengthOfStay).toHaveLength(2);
      expect(msg.RestrictionStatus['@_Status']).toBe('Open');
      expect(msg.RestrictionStatus['@_ClosedToArrival']).toBe(true);
    });

    it('should set Close status for stop-sell restrictions', () => {
      const items = [
        { channelRoomCode: 'SGLK', date: '2026-04-15', available: 0, totalInventory: 10 },
      ];
      const restrictions = [
        {
          channelRoomCode: 'SGLK',
          channelRateCode: 'BAR',
          date: '2026-04-15',
          stopSell: true,
          closedToArrival: false,
          closedToDeparture: false,
        },
      ];

      const result = mapAvailabilityToOta('SM_H1', items, restrictions);
      const msg = (result['AvailStatusMessages'] as any).AvailStatusMessage[0];
      expect(msg.RestrictionStatus['@_Status']).toBe('Close');
    });
  });

  describe('mapRatesToOta', () => {
    it('should map rate items with currency', () => {
      const items = [
        {
          channelRoomCode: 'SGLK',
          channelRateCode: 'FLEX',
          date: '2026-04-15',
          amount: 149.50,
          currencyCode: 'EUR',
        },
      ];

      const result = mapRatesToOta('SM_H1', items);
      const messages = result['RateAmountMessages'] as any;

      expect(messages['@_HotelCode']).toBe('SM_H1');
      const msg = messages.RateAmountMessage[0];
      expect(msg.StatusApplicationControl['@_RatePlanCode']).toBe('FLEX');
      expect(msg.Rates.Rate.BaseByGuestAmts.BaseByGuestAmt['@_AmountAfterTax']).toBe(149.50);
      expect(msg.Rates.Rate.BaseByGuestAmts.BaseByGuestAmt['@_CurrencyCode']).toBe('EUR');
    });

    it('should include single occupancy pricing when provided', () => {
      const items = [
        {
          channelRoomCode: 'DBLK',
          channelRateCode: 'BAR',
          date: '2026-04-15',
          amount: 200,
          currencyCode: 'USD',
          singleOccupancy: 160,
        },
      ];

      const result = mapRatesToOta('SM_H1', items);
      const msg = (result['RateAmountMessages'] as any).RateAmountMessage[0];
      const amts = msg.Rates.Rate.BaseByGuestAmts.BaseByGuestAmt;
      expect(amts).toHaveLength(2);
      expect(amts[0]['@_NumberOfGuests']).toBe(2);
      expect(amts[1]['@_NumberOfGuests']).toBe(1);
      expect(amts[1]['@_AmountAfterTax']).toBe(160);
    });
  });

  describe('mapSiteMinderReservationToHaip', () => {
    const sampleData = {
      ReservationsList: {
        HotelReservation: {
          '@_ResStatus': 'Commit',
          '@_CreateDateTime': '2026-04-02T14:30:00Z',
          UniqueID: { '@_Type': 14, '@_ID': 'SM-98765432' },
          POS: {
            Source: {
              BookingChannel: { CompanyName: 'Expedia' },
            },
          },
          RoomStays: {
            RoomStay: {
              RoomTypes: { RoomType: { '@_RoomTypeCode': 'SGLK' } },
              RatePlans: { RatePlan: { '@_RatePlanCode': 'FLEX' } },
              GuestCounts: {
                GuestCount: [
                  { '@_AgeQualifyingCode': 10, '@_Count': 1 },
                ],
              },
              TimeSpan: { '@_Start': '2026-04-20', '@_End': '2026-04-22' },
              Total: { '@_AmountAfterTax': '280.00', '@_CurrencyCode': 'EUR' },
            },
          },
          ResGuests: {
            ResGuest: {
              Profiles: {
                ProfileInfo: {
                  Profile: {
                    Customer: {
                      PersonName: { GivenName: 'Maria', Surname: 'Garcia' },
                      Email: 'maria.garcia@example.com',
                      Telephone: { '@_PhoneNumber': '+34-555-0456' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    it('should map SiteMinder reservation to HAIP format', () => {
      const reservations = mapSiteMinderReservationToHaip(sampleData);

      expect(reservations).toHaveLength(1);
      const res = reservations[0]!;

      expect(res.externalConfirmation).toBe('SM-98765432');
      expect(res.channelCode).toBe('siteminder');
      expect(res.guestFirstName).toBe('Maria');
      expect(res.guestLastName).toBe('Garcia');
      expect(res.guestEmail).toBe('maria.garcia@example.com');
      expect(res.channelRoomCode).toBe('SGLK');
      expect(res.channelRateCode).toBe('FLEX');
      expect(res.arrivalDate).toBe('2026-04-20');
      expect(res.departureDate).toBe('2026-04-22');
      expect(res.totalAmount).toBe(280);
      expect(res.currencyCode).toBe('EUR');
      expect(res.status).toBe('new');
    });

    it('should extract source channel (which OTA)', () => {
      const reservations = mapSiteMinderReservationToHaip(sampleData);
      expect((reservations[0]!.rawPayload as any).sourceChannel).toBe('Expedia');
    });

    it('should map cancelled reservation', () => {
      const cancelData = {
        ReservationsList: {
          HotelReservation: {
            ...sampleData.ReservationsList.HotelReservation,
            '@_ResStatus': 'Cancel',
          },
        },
      };

      const reservations = mapSiteMinderReservationToHaip(cancelData);
      expect(reservations[0]!.status).toBe('cancelled');
    });

    it('should map modified reservation', () => {
      const modData = {
        ReservationsList: {
          HotelReservation: {
            ...sampleData.ReservationsList.HotelReservation,
            '@_ResStatus': 'Modify',
          },
        },
      };

      const reservations = mapSiteMinderReservationToHaip(modData);
      expect(reservations[0]!.status).toBe('modified');
    });

    it('should handle empty reservation list', () => {
      const result = mapSiteMinderReservationToHaip({});
      expect(result).toHaveLength(0);
    });

    it('should handle multiple reservations', () => {
      const multiData = {
        ReservationsList: {
          HotelReservation: [
            sampleData.ReservationsList.HotelReservation,
            {
              ...sampleData.ReservationsList.HotelReservation,
              UniqueID: { '@_Type': 14, '@_ID': 'SM-11111111' },
            },
          ],
        },
      };

      const result = mapSiteMinderReservationToHaip(multiData);
      expect(result).toHaveLength(2);
      expect(result[0]!.externalConfirmation).toBe('SM-98765432');
      expect(result[1]!.externalConfirmation).toBe('SM-11111111');
    });
  });

  describe('buildNotifConfirmation', () => {
    it('should build confirmation for single reservation', () => {
      const result = buildNotifConfirmation('SM_H1', [
        { externalConfirmation: 'SM-98765432', pmsConfirmation: 'CH-ABC-XYZ' },
      ]);

      expect(result['@_HotelCode']).toBe('SM_H1');
      expect(result).toHaveProperty('Success');
      const hotelRes = (result as any).HotelReservations.HotelReservation;
      expect(hotelRes).toHaveLength(1);
      expect(hotelRes[0].UniqueID['@_ID']).toBe('SM-98765432');
    });

    it('should build confirmation for multiple reservations', () => {
      const result = buildNotifConfirmation('SM_H1', [
        { externalConfirmation: 'SM-111', pmsConfirmation: 'CH-1' },
        { externalConfirmation: 'SM-222', pmsConfirmation: 'CH-2' },
      ]);

      const hotelRes = (result as any).HotelReservations.HotelReservation;
      expect(hotelRes).toHaveLength(2);
    });
  });
});
