/**
 * Expected Laravel API contract — the single place where every storefront endpoint path is declared.
 * Paths are relative to NEXT_PUBLIC_API_URL (e.g. https://api.example.com/api). The full request / response
 * description lives in docs/API_CONTRACT.md. Nothing here exists in the PHP application as a REST route; the
 * PHP equivalent of each endpoint is noted in the comment.
 */
export default Object.freeze({
  // --- Public content ---------------------------------------------------------------------------------
  shell: '/storefront/shell', //                  layouts/app.php (settings + menus)
  settings: '/storefront/settings', //            settings table
  home: '/storefront/home', //                    HomeController::index
  page: (slug) => `/storefront/pages/${slug}`, // PageController::show
  post: (slug) => `/storefront/posts/${slug}`, // PageController::showPost
  sitemap: '/storefront/sitemap', //              (new) sitemap.xml
  newsletter: '/storefront/newsletter', //        home newsletter form (client-side only in PHP)
  contact: '/storefront/contact', //              contact form (client-side only in PHP)

  // --- Catalog ----------------------------------------------------------------------------------------
  catalog: '/catalog', //                         CatalogController::catalog (GET /catalog)
  product: (slug) => `/catalog/products/${slug}`, // CatalogController::productDetail
  productsByIds: '/catalog/products', //          wishlist page

  // --- Cart (session-based in PHP, token/cookie based here) ------------------------------------------
  cart: '/cart', //                               GET /api/cart            DELETE clears (/api/cart/clear)
  cartItems: '/cart/items', //                    POST /api/cart/add
  cartItem: (key) => `/cart/items/${key}`, //     POST /api/cart/update | /api/cart/remove
  cartCoupon: '/cart/coupon', //                  POST /api/cart/coupon | DELETE /api/cart/coupon/remove
  cartGiftCards: '/cart/gift-cards', //           POST /api/gift-cards/add

  // --- Checkout / orders ------------------------------------------------------------------------------
  checkout: '/checkout', //                       CheckoutController::index (cities, payment settings, addresses)
  checkoutShipping: '/checkout/shipping', //      POST /api/checkout/calculate-shipping
  checkoutOrders: '/checkout/orders', //          POST /checkout/process
  checkoutVerify: '/checkout/payment/verify', //  GET|POST /checkout/payment/callback/{provider}
  order: (number) => `/orders/${number}`, //      CheckoutController::orderConfirmation

  // --- Authentication ---------------------------------------------------------------------------------
  login: '/auth/login', //                        POST /login
  loginOtp: '/auth/login/otp', //                 POST /login (login_type=otp)
  register: '/auth/register', //                  POST /register
  verifyOtp: '/auth/otp/verify', //               POST /verify-otp
  resendOtp: '/auth/otp/resend', //               POST /resend-otp
  forgotPassword: '/auth/forgot-password', //     POST /forgot-password
  logout: '/auth/logout', //                      GET /logout
  me: '/auth/me', //                              Auth::user()
  refresh: '/auth/refresh', //                    (new) token refresh

  // --- Customer account -------------------------------------------------------------------------------
  accountOverview: '/account', //                 ProfileController::index
  accountProfile: '/account/profile', //          POST /profile/update-info
  accountPassword: '/account/password', //        POST /profile/change-password
  accountAddresses: '/account/addresses', //      /profile/addresses[/store|/delete|/default]
  accountAddress: (id) => `/account/addresses/${id}`,
  accountAddressDefault: (id) => `/account/addresses/${id}/default`,
  accountOrders: '/account/orders', //            ProfileController::orders
  accountOrder: (number) => `/account/orders/${number}`, // orderDetail
  accountOrderCancel: (number) => `/account/orders/${number}/cancel`,
  accountGiftCards: '/account/gift-cards',
  accountNotifications: '/account/notifications',
  accountNotificationRead: (id) => `/account/notifications/${id}/read`,
  accountNotificationsReadAll: '/account/notifications/read-all',
  accountPreferences: '/account/preferences', //  /profile/settings[/save]
  wishlist: '/account/wishlist', //               /api/wishlist/toggle (GET ids, POST toggle)
  wishlistToggle: '/account/wishlist/toggle',
});
