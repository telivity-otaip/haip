export { BookingComAdapter } from './booking-com.adapter';
export { type BookingComConfig, DEFAULT_BOOKING_COM_CONFIG } from './booking-com.config';
export { buildOtaXml, parseOtaXml } from './booking-com.xml';
export {
  mapAvailabilityToOta,
  mapRatesToOta,
  mapRestrictionsToOta,
  mapOtaReservationToHaip,
  buildReservationConfirmation,
} from './booking-com.mapper';
