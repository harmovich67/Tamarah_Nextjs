import { resolveApiMode, resolveAuthStrategy } from '@tamrna/shared/api';

/** Central runtime configuration (Vite env vars). */
export const config = Object.freeze({
  apiMode: resolveApiMode(import.meta.env.VITE_API_MODE),
  apiUrl: import.meta.env.VITE_API_URL || '',
  mockFallback: String(import.meta.env.VITE_MOCK_FALLBACK ?? 'true').toLowerCase() !== 'false',
  authStrategy: resolveAuthStrategy(import.meta.env.VITE_AUTH_STRATEGY),
  storefrontUrl: (import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000').replace(/\/$/, ''),
});
