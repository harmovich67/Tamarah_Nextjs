import { createApiClient } from '@tamrna/shared/api';
import { ADMIN_LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from '@tamrna/shared/constants';
import { safeStorage } from '@tamrna/shared/api';
import { config } from './config';
import { getStoredToken, notifyUnauthorized } from './session';

export const getAdminLocale = () => {
  const v = safeStorage.get(ADMIN_LOCALE_STORAGE_KEY);
  return v === 'en' || v === 'ar' ? v : DEFAULT_LOCALE;
};

/** The single HTTP client used by every Laravel adapter (UI code never imports it). */
export const apiClient = createApiClient({
  baseUrl: config.apiUrl,
  strategy: config.authStrategy,
  getToken: getStoredToken,
  getLocale: getAdminLocale,
  onUnauthorized: notifyUnauthorized,
});
