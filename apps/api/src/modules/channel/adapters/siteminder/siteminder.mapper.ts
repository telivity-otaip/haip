import type {
  AvailabilityPushParams,
  RatePushParams,
  RestrictionPushParams,
  ChannelReservation,
} from '../../channel-adapter.interface';

/**
 * Map HAIP availability + restrictions → OTA_HotelAvailNotifRQ body.
 * SiteMinder combines availability and restrictions in one message.
 */
export function mapAvailabilityToOta(
  hotelCode: string,
  items: AvailabilityPushParams['items'],
  restrictions?: RestrictionPushParams['items'],
): Record<string, unknown> {
  // Build restriction lookup: key = `${roomCode}|${date}`
  const restrictionMap = new Map<string, RestrictionPushParams['items'][number]>();
  if (restrictions) {
    for (const r of restrictions) {
      restrictionMap.set(`${r.channelRoomCode}|${r.date}`, r);
    }
  }

  const availStatusMessages = items.map((item) => {
    const restriction = restrictionMap.get(`${item.channelRoomCode}|${item.date}`);

    const msg: Record<string, unknown> = {
      '@_BookingLimit': item.available,
      StatusApplicationControl: {
        '@_Start': item.date,
        '@_End': item.date,
        '@_InvTypeCode': item.channelRoomCode,
      },
    };

    // Include restrictions if available
    if (restriction) {
      msg['LengthsOfStay'] = {
        LengthOfStay: [
          { '@_MinMaxMessageType': 'MinLOS', '@_Time': restriction.minLos ?? 1 },
          { '@_MinMaxMessageType': 'MaxLOS', '@_Time': restriction.maxLos ?? 999 },
        ],
      };
      msg['RestrictionStatus'] = {
        '@_Restriction': 'Master',
        '@_Status': restriction.stopSell ? 'Close' : 'Open',
        '@_SellThroughOpenIndicator': !restriction.closedToArrival,
      };
      if (restriction.closedToArrival) {
        msg['RestrictionStatus'] = {
          ...msg['RestrictionStatus'] as object,
          '@_ClosedToArrival': true,
        };
      }
      if (restriction.closedToDeparture) {
        msg['RestrictionStatus'] = {
          ...msg['RestrictionStatus'] as object,
          '@_ClosedToDeparture': true,
        };
      }
    }

    return msg;
  });

  return {
    AvailStatusMessages: {
      '@_HotelCode': hotelCode,
      AvailStatusMessage: availStatusMessages,
    },
  };
}

/**
 * Map HAIP rate items → OTA_HotelRateAmountNotifRQ body.
 */
export function mapRatesToOta(
  hotelCode: string,
  items: RatePushParams['items'],
): Record<string, unknown> {
  const rateAmountMessages = items.map((item) => {
    const baseByGuestAmts: Record<string, unknown>[] = [
      {
        '@_AmountAfterTax': item.amount,
        '@_CurrencyCode': item.currencyCode,
        '@_NumberOfGuests': 2,
      },
    ];

    // Occupancy-based pricing
    if (item.singleOccupancy !== undefined) {
      baseByGuestAmts.push({
        '@_AmountAfterTax': item.singleOccupancy,
        '@_CurrencyCode': item.currencyCode,
        '@_NumberOfGuests': 1,
      });
    }

    return {
      StatusApplicationControl: {
        '@_Start': item.date,
        '@_End': item.date,
        '@_InvTypeCode': item.channelRoomCode,
        '@_RatePlanCode': item.channelRateCode,
      },
      Rates: {
        Rate: {
          BaseByGuestAmts: {
            BaseByGuestAmt: baseByGuestAmts.length === 1
              ? baseByGuestAmts[0]
              : baseByGuestAmts,
          },
        },
      },
    };
  });

  return {
    RateAmountMessages: {
      '@_HotelCode': hotelCode,
      RateAmountMessage: rateAmountMessages,
    },
  };
}

/**
 * Parse OTA_ResRetrieveRS → array of HAIP ChannelReservation objects.
 */
export function mapSiteMinderReservationToHaip(
  data: Record<string, unknown>,
): ChannelReservation[] {
  const reservations: ChannelReservation[] = [];

  const resList = extractArray(data, 'ReservationsList', 'HotelReservation');

  for (const hotelRes of resList) {
    const res = hotelRes as any;
    const resStatus = res['@_ResStatus'] ?? 'Commit';

    let status: ChannelReservation['status'] = 'new';
    if (resStatus === 'Cancel') status = 'cancelled';
    else if (resStatus === 'Modify') status = 'modified';

    // Guest profile
    const resGuest = res.ResGuests?.ResGuest;
    const profile = resGuest?.Profiles?.ProfileInfo?.Profile;
    const personName = profile?.Customer?.PersonName ?? {};
    const guestFirstName = String(personName.GivenName ?? 'Guest');
    const guestLastName = String(personName.Surname ?? 'Unknown');
    const guestEmail = profile?.Customer?.Email
      ? String(profile.Customer.Email)
      : undefined;
    const guestPhone = profile?.Customer?.Telephone?.['@_PhoneNumber']
      ? String(profile.Customer.Telephone['@_PhoneNumber'])
      : undefined;

    // Room stay
    const roomStay = res.RoomStays?.RoomStay ?? res.RoomStay ?? {};
    const roomTypeCode = String(
      roomStay.RoomTypes?.RoomType?.['@_RoomTypeCode'] ?? 'UNKNOWN',
    );
    const ratePlanCode = String(
      roomStay.RatePlans?.RatePlan?.['@_RatePlanCode'] ?? 'UNKNOWN',
    );

    // Dates
    const timeSpan = roomStay.TimeSpan ?? {};
    const arrivalDate = String(timeSpan['@_Start'] ?? '');
    const departureDate = String(timeSpan['@_End'] ?? '');

    // Total
    const total = roomStay.Total ?? {};
    const totalAmount = parseFloat(total['@_AmountAfterTax'] ?? '0');
    const currencyCode = String(total['@_CurrencyCode'] ?? 'USD');

    // Occupancy
    const guestCounts = roomStay.GuestCounts?.GuestCount;
    let adults = 2;
    let children = 0;
    if (Array.isArray(guestCounts)) {
      for (const gc of guestCounts) {
        if (gc['@_AgeQualifyingCode'] === 10) adults = gc['@_Count'] ?? 2;
        if (gc['@_AgeQualifyingCode'] === 8) children = gc['@_Count'] ?? 0;
      }
    }

    // Special requests
    const specialRequests =
      res.SpecialRequests?.SpecialRequest?.Text ?? undefined;

    // External confirmation = SiteMinder booking reference
    const externalConfirmation = String(
      res.UniqueID?.['@_ID'] ??
        res['@_ResID_Value'] ??
        `SM-${Date.now()}`,
    );

    // Source channel (which OTA originated this booking)
    const sourceChannel = res.POS?.Source?.BookingChannel?.CompanyName
      ? String(res.POS.Source.BookingChannel.CompanyName)
      : undefined;

    // Booking date
    const createDateStr = res['@_CreateDateTime'];
    const channelBookingDate = createDateStr
      ? new Date(createDateStr)
      : new Date();

    reservations.push({
      externalConfirmation,
      channelCode: 'siteminder',
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      channelRoomCode: roomTypeCode,
      channelRateCode: ratePlanCode,
      arrivalDate,
      departureDate,
      adults,
      children,
      totalAmount,
      currencyCode,
      specialRequests: specialRequests ? String(specialRequests) : undefined,
      status,
      channelBookingDate,
      rawPayload: {
        ...(hotelRes as Record<string, unknown>),
        sourceChannel,
      },
    });
  }

  return reservations;
}

/**
 * Build NotifRQ body to confirm reservation receipt.
 */
export function buildNotifConfirmation(
  hotelCode: string,
  confirmations: Array<{ externalConfirmation: string; pmsConfirmation: string }>,
): Record<string, unknown> {
  return {
    '@_HotelCode': hotelCode,
    Success: '',
    HotelReservations: {
      HotelReservation: confirmations.map((c) => ({
        UniqueID: { '@_Type': '14', '@_ID': c.externalConfirmation },
        ResGlobalInfo: {
          HotelReservationIDs: {
            HotelReservationID: {
              '@_ResID_Type': '3',
              '@_ResID_Value': c.pmsConfirmation,
            },
          },
        },
      })),
    },
  };
}

// --- helpers ---

function extractArray(
  data: Record<string, unknown>,
  containerKey: string,
  itemKey: string,
): unknown[] {
  const container = (data as any)[containerKey];
  if (!container) return [];
  const items = container[itemKey];
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}
