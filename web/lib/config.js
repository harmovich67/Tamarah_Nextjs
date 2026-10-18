import { resolveApiMode, resolveAuthStrategy } from '@tamrna/shared/api';

/**
 * Central runtime configuration. NEXT_PUBLIC_* variables must be referenced literally so that Next.js can
 * inline them into the client bundle.
 */
export const config = Object.freeze({
  apiMode: resolveApiMode(process.env.NEXT_PUBLIC_API_MODE),
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  mockFallback: String(process.env.NEXT_PUBLIC_MOCK_FALLBACK ?? 'true').toLowerCase() !== 'false',
  authStrategy: resolveAuthStrategy(process.env.NEXT_PUBLIC_AUTH_STRATEGY),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  dashboardUrl: (process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:5173').replace(/\/$/, ''),
});

export const isMockMode = config.apiMode === 'mock';
