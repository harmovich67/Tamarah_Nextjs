import { createApiClient } from '@tamrna/shared/api';
import { config } from './config';
import { getStoredToken, notifyUnauthorized } from './session';
import { getClientLocale } from './locale-client';

/** The single HTTP client used by every Laravel adapter (never imported by UI code directly). */
export const apiClient = createApiClient({
  baseUrl: config.apiUrl,
  strategy: config.authStrategy,
  getToken: getStoredToken,
  getLocale: getClientLocale,
  onUnauthorized: notifyUnauthorized,
});
