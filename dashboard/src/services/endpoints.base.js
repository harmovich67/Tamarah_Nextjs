/**
 * Expected Laravel API contract for the admin dashboard — every endpoint path in one place.
 * Paths are relative to VITE_API_URL (e.g. https://api.example.com/api). Full request / response descriptions
 * live in docs/API_CONTRACT.md. All routes require authentication and enforce the same role rules as the
 * legacy PHP route middleware (store_manager / super_admin) on the server.
 */
const crud = (base) => ({ list: base, item: (id) => `${base}/${id}` });

export default Object.freeze({
  // Auth
  login: '/admin/auth/login', //            POST /admin/login
  logout: '/admin/auth/logout',
  me: '/admin/auth/me',
  refresh: '/admin/auth/refresh',

  // Uploads return a media id, which is then sent as category.image / product.gallery[].
  media: { upload: '/general/attachment', remove: (id) => `/general/attachment/delete/${id}` },

  dashboard: '/admin/home', //              GET ?date_filter=all|today|week|month|year|custom[&from_date&to_date]

  products: crud('/admin/products'), //     ProductsController
  productOptions: '/admin/products/options',
  productStatus: (id) => `/admin/products/${id}/status`, //       POST: toggle is_active
  productPublished: (id) => `/admin/products/${id}/published`, // POST: toggle is_published
  variantStock: (id) => `/admin/variants/${id}/stock`, // POST /api/admin/stock/update
  categories: crud('/admin/categories'), // StructureController (categories)
  categoryStatus: (id) => `/admin/categories/${id}/status`, // POST: toggle is_active
  categorySortOrder: '/admin/categories/sort-order', //        POST: { order[id]: position }
  warehouses: crud('/admin/warehouses'), // StructureController (warehouses)
  orders: crud('/admin/orders'), //         OrdersController
  orderAction: (id, action) => `/admin/orders/${id}/${action}`, // POST; action = process | ready | deliver | complete | cancel

  coupons: crud('/admin/coupons'), //       CouponsController
  couponToggle: (id) => `/admin/coupons/${id}/toggle`,
  shippingZones: crud('/admin/shipping-zones'), // ShippingZonesController
  shippingZoneToggle: (id) => `/admin/shipping-zones/${id}/toggle`,

  paymentSettings: '/admin/settings/payments', // SettingsController::index/update
  paymentTest: '/admin/settings/payments/test-connection', // POST /api/admin/payment/test-connection
  siteSettings: '/admin/settings/site', //  SettingsController::siteSettings/updateSiteSettings

  translations: '/admin/translations', //   TranslationsController
  translation: (key) => `/admin/translations/${encodeURIComponent(key)}`,

  pages: crud('/admin/pages'), //           PagesController
  pageStatus: (id) => `/admin/pages/${id}/status`,
  posts: crud('/admin/posts'), //           PostsController
  customFields: crud('/admin/custom-fields'), // FieldGroupsController
  customFieldTargets: '/admin/custom-fields/targets',

  users: crud('/admin/users'), //           UsersController (mock contract)
  admins: crud('/admin/admins'), //         Tamrna backend: admin accounts (POST {id}/status toggles active)
  adminStatus: (id) => `/admin/admins/${id}/status`,
  roles: crud('/admin/roles'), //           name via en[name] / ar[name], permissions[]
  roleList: '/admin/role-not-paginated', //  every role, unpaginated

  // In the Tamrna backend but without a dashboard screen yet (see README "Not wired").
  clients: crud('/admin/clients'), //       GET ?keyword&is_active
  clientToggleBan: (id) => `/admin/clients/${id}/toggle-ban`,
  giftCards: crud('/admin/gift-cards'), //  { amount, sort_order, is_active }
  giftCardStatus: (id) => `/admin/gift-cards/${id}/status`,
  giftCardSortOrder: '/admin/gift-cards/sort-order',
  features: crud('/admin/features'), //     GET ?filters[type]=home|principles|about|story|future
  featureStatus: (id) => `/admin/features/${id}/status`,
  featureSortOrder: '/admin/features/sort-order',
  reviews: crud('/admin/reviews'),
  reviewHide: (id) => `/admin/reviews/${id}/update-hide`,
  sections: crud('/admin/sections'), //     type = story | future | commitment, images[]
  systemNumbers: crud('/admin/system-numbers'),
  systemNumberStatus: (id) => `/admin/system-numbers/${id}/status`,
  systemNumberSortOrder: '/admin/system-numbers/sort-order',
  branches: crud('/admin/branches'),
  branchStatus: (id) => `/admin/branches/${id}/status`,
  branchTogglePickup: (id) => `/admin/branches/${id}/toggle-pickup`,
  contacts: crud('/admin/contacts'), //     read / delete only
  cities: crud('/admin/cities'),
  cityStatus: (id) => `/admin/cities/${id}/status`,
  cityPrivateDelivery: (id) => `/admin/cities/${id}/update-private-delivery`,
  adminNotifications: crud('/admin/notifications/sender'), // broadcast to clients: content[ar|en][title|body], type=client
  adminSettings: '/admin/settings', //     GET list, POST settings[i][key|value]
  productDiscountToggle: (id, variantId) => `/admin/products/${id}/variants/${variantId}/toggle-discount`,
  productSortOrder: '/admin/products/sort-order',

  homeSections: '/admin/home-sections', //  HomeSectionsController
  homeSection: (id) => `/admin/home-sections/${id}`,
  homeSectionMove: (id) => `/admin/home-sections/${id}/move`,
  homeSectionToggle: (id) => `/admin/home-sections/${id}/toggle`,
  homeFeatures: '/admin/home-sections/features',
  homeTestimonials: '/admin/home-sections/testimonials',
  homeNewsletter: '/admin/home-sections/newsletter',
  banners: crud('/admin/banners'), //       BannersController
  bannerMove: (id) => `/admin/banners/${id}/move`,
  bannerToggle: (id) => `/admin/banners/${id}/toggle`,
  bannerSortOrder: '/admin/banners/sort-order', //     POST { order[id]: position }
  menus: crud('/admin/menus'), //           MenuController

  security: '/admin/security', //           SecurityController
  securitySettings: '/admin/security/settings',
  securityBlockedIps: '/admin/security/blocked-ips',
  securityBlockedIp: (ip) => `/admin/security/blocked-ips/${encodeURIComponent(ip)}`,
  logs: '/admin/logs', //                   LogsController
  logsDownload: '/admin/logs/download',
  cache: '/admin/cache', //                 CacheController
  cacheClear: '/admin/cache/clear',
  cachePreload: '/admin/cache/preload',
  backups: '/admin/backups', //             BackupController
  backup: (name) => `/admin/backups/${encodeURIComponent(name)}`,
  backupDownload: (name) => `/admin/backups/${encodeURIComponent(name)}/download`,
  backupRestore: '/admin/backups/restore',
  backupSettings: '/admin/backups/settings',
});
