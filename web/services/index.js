import { config } from '@/lib/config';
import * as mock from './adapters/mock';
import * as laravel from './adapters/laravel';
import * as tamrna from './adapters/tamrna';

/**
 * Service facade. UI code imports `contentService`, `cartService`, ... and never learns whether the mock or the
 * Laravel adapter is behind them. Switch with NEXT_PUBLIC_API_MODE=mock|laravel.
 *
 * In laravel mode the storefront reads the real Tamrna backend for the catalog (products, categories, product page),
 * the home page products / categories, the cart (guest cart), the contact form, sign-in / registration, the account
 * (profile, addresses, orders, favourites, notifications) and checkout (adapters/tamrna). The backend has no payment,
 * coupons, menus or settings yet, so those keep running on the mock adapters while
 * NEXT_PUBLIC_MOCK_FALLBACK is not "false". Set it to "false" to use the contract endpoints of docs/API_CONTRACT.md.
 */
const live = config.apiMode === 'laravel';
const partial = live && config.mockFallback;

const catalog = partial ? { getCatalog: tamrna.getCatalog, getProduct: tamrna.getProduct, getProductsByIds: tamrna.getProductsByIds } : null;

const cart = partial
  ? {
      ...mock.cart,
      getCart: tamrna.getCart,
      addItem: tamrna.addItem,
      updateItem: tamrna.updateItem,
      removeItem: tamrna.removeItem,
      clearCart: tamrna.clearCart,
      fitItem: tamrna.fitItem,
      applyCoupon: tamrna.applyCoupon,
      removeCoupon: tamrna.removeCoupon,
      addGiftCard: tamrna.addGiftCard,
    }
  : null;

const content = partial
  ? {
      ...mock.content,
      getHomeData: async () => {
        const { featureCards, reviewCards, ...real } = await tamrna.realHomeParts();
        const home = { ...(await mock.content.getHomeData()), ...real };
        // The "features" and "testimonials" sections show what the dashboard holds (Features type home, visible reviews).
        const fill = (key, setting, rows) => (sec) => (sec.section_key === key && rows.length ? { ...sec, settings: { ...sec.settings, [setting]: rows } } : sec);
        return { ...home, homeSections: home.homeSections.map(fill('features', 'cards', featureCards)).map(fill('testimonials', 'reviews', reviewCards)) };
      },
      getSitemapEntries: async () => ({ ...(await mock.content.getSitemapEntries()), ...(await tamrna.realSitemapParts()) }),
      sendContactMessage: tamrna.sendContactMessage,
      getAboutData: tamrna.getAbout,
      getBranches: tamrna.getBranches,
      getGiftCardOptions: tamrna.getGiftCardOptions,
      getSettings: async () => ({ ...(await mock.content.getSettings()), ...(await tamrna.realSettings()) }),
      getShellData: async () => {
        const data = await mock.content.getShellData();
        return { ...data, settings: { ...data.settings, ...(await tamrna.realSettings()) } };
      },
    }
  : null;

// Sign-in, account (profile, addresses, orders, favourites) and checkout run on the backend too.
const customer = partial ? { auth: tamrna.auth, account: { ...mock.account, ...tamrna.account }, checkout: tamrna.checkout } : null;

const adapter = live ? laravel : mock;

export const contentService = content || adapter.content;
export const catalogService = catalog || adapter.catalog;
export const cartService = cart || adapter.cart;
export const checkoutService = customer?.checkout || adapter.checkout;
export const authService = customer?.auth || adapter.auth;
export const accountService = customer?.account || adapter.account;
