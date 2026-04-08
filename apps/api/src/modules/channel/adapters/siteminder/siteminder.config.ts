/**
 * Configuration for a SiteMinder pmsXchange channel connection.
 * Stored in channelConnections.config JSON.
 */
export interface SiteMinderConfig {
  /** SiteMinder property/hotel code */
  hotelCode: string;

  /** WSSE username for pmsXchange API */
  username: string;

  /** WSSE password for pmsXchange API */
  password: string;

  /**
   * Base URL for the pmsXchange endpoint.
   * Mock: http://localhost:4001/pmsxchange
   * Test: https://pmsxchange.siteminder.com/pmsxchange
   * Live: https://pmsxchange.siteminder.com/pmsxchange
   */
  baseUrl: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;

  /** Max retry attempts for failed requests (default: 3) */
  maxRetries?: number;

  /** Reservation poll interval in ms (default: 120000 = 2 min) */
  pollIntervalMs?: number;
}

export const DEFAULT_SITEMINDER_CONFIG: Partial<SiteMinderConfig> = {
  baseUrl: 'http://localhost:4001/pmsxchange',
  timeoutMs: 30_000,
  maxRetries: 3,
  pollIntervalMs: 120_000,
};
