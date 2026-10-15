import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';

/**
 * Laravel REST adapters. Every function mirrors a mock adapter function one to one and returns the same
 * shape, so the UI never knows which adapter is active. Laravel responses are expected to look like
 * `{ success: true, data: ... }` (see docs/API_CONTRACT.md); `unwrap` accepts a bare payload as well.
 */
const unwrap = (res) => (res && typeof res === 'object' && 'data' in res && !Array.isArray(res) ? res.data : res);
const withMessage = (res) => ({ ...unwrap(res), message: res?.message });

export const content = {
  getSettings: async () => unwrap(await api.get(e.settings)),
  getShellData: async () => {
    const d = unwrap(await api.get(e.shell));
    return { settings: d.settings, menus: d.menus, hasHero: d.has_hero ?? d.hasHero };
  },
  getHomeData: async () => unwrap(await api.get(e.home)),
  getPage: async (slug) => unwrap(await api.get(e.page(slug))),
  getPost: async (slug) => unwrap(await api.get(e.post(slug))),
  getSitemapEntries: async () => unwrap(await api.get(e.sitemap)),
  subscribeNewsletter: async (payload) => api.post(e.newsletter, payload),
  sendContactMessage: async (payload) => api.post(e.contact, payload),
};

export const catalog = {
  getCatalog: async (params) => unwrap(await api.get(e.catalog, params)),
  getProduct: async (slug) => unwrap(await api.get(e.product(slug))),
  getProductsByIds: async (ids) => unwrap(await api.get(e.productsByIds, { ids })),
};

export const cart = {
  getCart: async () => unwrap(await api.get(e.cart)),
  addItem: async ({ productId, variantId, quantity }) =>
    withMessage(await api.post(e.cartItems, { product_id: productId, variant_id: variantId, quantity })),
  updateItem: async ({ key, quantity }) => withMessage(await api.patch(e.cartItem(key), { quantity })),
  removeItem: async ({ key }) => withMessage(await api.delete(e.cartItem(key))),
  clearCart: async () => withMessage(await api.delete(e.cart)),
  applyCoupon: async ({ code }) => withMessage(await api.post(e.cartCoupon, { code })),
  removeCoupon: async () => withMessage(await api.delete(e.cartCoupon)),
  addGiftCard: async (payload) => withMessage(await api.post(e.cartGiftCards, payload)),
};

export const checkout = {
  getCheckoutData: async () => unwrap(await api.get(e.checkout)),
  calculateShipping: async (payload) => unwrap(await api.post(e.checkoutShipping, payload)),
  placeOrder: async (payload) => unwrap(await api.post(e.checkoutOrders, payload)),
  getOrder: async (number) => unwrap(await api.get(e.order(number))),
  verifyPayment: async (payload) => unwrap(await api.post(e.checkoutVerify, payload)),
  getPaymentSession: async (number) => unwrap(await api.get(e.order(number))).order,
};

export const auth = {
  login: async (payload) => unwrap(await api.post(e.login, payload)),
  loginWithOtp: async (payload) => unwrap(await api.post(e.loginOtp, payload)),
  register: async (payload) => unwrap(await api.post(e.register, payload)),
  verifyOtp: async (payload) => unwrap(await api.post(e.verifyOtp, payload)),
  resendOtp: async (payload) => unwrap(await api.post(e.resendOtp, payload)),
  forgotPassword: async (payload) => unwrap(await api.post(e.forgotPassword, payload)),
  logout: async () => api.post(e.logout),
  currentUser: async () => unwrap(await api.get(e.me)),
  refresh: async () => unwrap(await api.post(e.refresh)),
};

export const account = {
  getOverview: async () => unwrap(await api.get(e.accountOverview)),
  updateInfo: async (payload) => unwrap(await api.put(e.accountProfile, payload)),
  changePassword: async (payload) => unwrap(await api.put(e.accountPassword, payload)),
  listAddresses: async () => unwrap(await api.get(e.accountAddresses)),
  saveAddress: async (payload) =>
    unwrap(payload.id ? await api.put(e.accountAddress(payload.id), payload) : await api.post(e.accountAddresses, payload)),
  deleteAddress: async (id) => api.delete(e.accountAddress(id)),
  setDefaultAddress: async (id) => api.post(e.accountAddressDefault(id)),
  listOrders: async () => unwrap(await api.get(e.accountOrders)),
  getOrder: async (number) => unwrap(await api.get(e.accountOrder(number))),
  cancelOrder: async (number) => unwrap(await api.post(e.accountOrderCancel(number))),
  listGiftCards: async () => unwrap(await api.get(e.accountGiftCards)),
  listNotifications: async () => unwrap(await api.get(e.accountNotifications)),
  markNotificationRead: async (id) => api.post(e.accountNotificationRead(id)),
  markAllNotificationsRead: async () => api.post(e.accountNotificationsReadAll),
  getPreferences: async () => unwrap(await api.get(e.accountPreferences)),
  savePreferences: async (payload) => api.put(e.accountPreferences, payload),
  getWishlistIds: async () => unwrap(await api.get(e.wishlist)),
  toggleWishlist: async (productId) => withMessage(await api.post(e.wishlistToggle, { product_id: productId })),
};
