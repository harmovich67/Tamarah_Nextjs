import { create } from 'zustand';
import { safeStorage } from '@tamrna/shared/api';
import { ADMIN_LOCALE_STORAGE_KEY, dirOf } from '@tamrna/shared/constants';
import { getAdminLocale } from '@/lib/apiClient';

/** Dashboard language (isolated from the storefront language, like I18n::getAdminLocale()). */
const apply = (locale) => {
  document.documentElement.lang = locale;
  document.documentElement.dir = dirOf(locale);
};

export const useLocaleStore = create((set) => ({
  locale: getAdminLocale(),
  setLocale: (locale) => {
    safeStorage.set(ADMIN_LOCALE_STORAGE_KEY, locale);
    apply(locale);
    set({ locale });
  },
}));

apply(useLocaleStore.getState().locale);
