import { config } from '@/lib/config';
import * as mock from './adapters/mock';
import * as laravel from './adapters/laravel';

/**
 * Service facade. Screens import `storeService`, `authService`... and never learn whether the mock or the Laravel
 * adapter is behind them. Switch with VITE_API_MODE=mock|laravel.
 *
 * The Tamrna backend does not expose every screen yet. In laravel mode the functions below keep running on the mock
 * adapters (demo data kept in this browser) so the rest of the dashboard stays usable; set VITE_MOCK_FALLBACK=false to
 * call the contract endpoints from docs/API_CONTRACT.md for them instead. Delete an entry once the backend ships it.
 */
const NOT_IN_BACKEND = {
  store: ['getDashboardStats', 'listWarehouses', 'createWarehouse', 'updateWarehouse', 'deleteWarehouse', 'listOrders', 'getOrder', 'updateOrderStatus', 'generateWaybill', 'updateStock'],
  commerce: '*',
  settings: '*',
  access: '*',
  cms: '*',
  system: '*',
};

// The homepage screen mixes sections (not in the backend) with banners (in the backend): sections stay on the mock
// adapter, banners come from the API.
const BACKEND_BANNER_FNS = ['createBanner', 'updateBanner', 'deleteBanner', 'toggleBanner', 'moveBanner'];
const hybridHome = () => ({
  ...mock.home,
  ...Object.fromEntries(BACKEND_BANNER_FNS.map((fn) => [fn, laravel.home[fn]])),
  // A failing banners endpoint must not take the whole screen down: sections still render, the banners tab shows the error.
  getHomeContent: async () => {
    const [content, banners] = await Promise.all([mock.home.getHomeContent(), laravel.home.listBanners().then((rows) => ({ rows }), (error) => ({ error }))]);
    return { ...content, banners: banners.rows ?? [], bannersError: banners.error ?? null };
  },
});

function pick(name) {
  if (config.apiMode !== 'laravel') return mock[name];
  if (name === 'home' && config.mockFallback) return hybridHome();
  const skip = config.mockFallback ? NOT_IN_BACKEND[name] : null;
  if (!skip) return laravel[name];
  if (skip === '*') return mock[name];
  return { ...laravel[name], ...Object.fromEntries(skip.map((fn) => [fn, mock[name][fn]])) };
}

export const authService = pick('auth');
export const storeService = pick('store');
export const commerceService = pick('commerce');
export const settingsService = pick('settings');
export const accessService = pick('access');
export const cmsService = pick('cms');
export const homeService = pick('home');
export const systemService = pick('system');
