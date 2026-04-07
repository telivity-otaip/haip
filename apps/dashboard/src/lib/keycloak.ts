import Keycloak from 'keycloak-js';

/**
 * Keycloak instance for OIDC authentication.
 *
 * Uses PKCE flow (public client) for SPA security.
 * Config is loaded from environment variables or defaults.
 */
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'haip',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'haip-dashboard',
});

/**
 * Check if auth is enabled via environment variable.
 * When disabled (default), the app runs without Keycloak.
 */
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';
