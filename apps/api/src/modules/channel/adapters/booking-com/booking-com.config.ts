/**
 * Configuration for a Booking.com channel connection.
 * Stored in channelConnections.config JSON.
 */
export interface BookingComConfig {
  /** Booking.com hotel ID assigned during onboarding */
  hotelId: string;

  /** Basic Auth username for Connectivity Partner API */
  username: string;

  /** Basic Auth password for Connectivity Partner API */
  password: string;

  /**
   * Base URL for the API.
   * Mock: http://localhost:4000/ota
   * Test: https://supply-xml.booking.com/hotels/xml
   * Live: https://supply-xml.booking.com/hotels/xml
   */
  baseUrl: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;

  /** Max retry attempts for failed requests (default: 3) */
  maxRetries?: number;
}

export const DEFAULT_BOOKING_COM_CONFIG: Partial<BookingComConfig> = {
  baseUrl: 'http://localhost:4000/ota',
  timeoutMs: 30_000,
  maxRetries: 3,
};
