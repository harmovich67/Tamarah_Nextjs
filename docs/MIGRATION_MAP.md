# Migration map: PHP (`alaz`) → Next.js + React/Vite (`alaz-modern`)

How every legacy screen, route and asset was carried over. The rule was **visual and behavioural parity**: same URLs, same
class names / Tailwind classes, same copy (AR + EN), same flows. Nothing was redesigned or dropped.

## 1. Architecture

| Legacy | Modern | Notes |
| --- | --- | --- |
| `index.php` front controller + `app/Controllers/*` | `web/app/**` (App Router) | Server components read the locale cookie and call `services/`. |
| `resources/views/storefront|auth|layouts|components/*.php` | `web/components/**`, `web/features/**` | 1:1 JSX ports with the **same class names**; legacy CSS is reused from `web/styles/legacy/`. |
| `resources/views/admin/*.php` + `/admin/*` routes | `dashboard/src/pages/**` (React Router) | Tailwind classes copied from the PHP views. |
| PHP session + CSRF forms | API client + Sanctum token **or** cookie (`shared/api`) | Strategy switch: `*_AUTH_STRATEGY=token|cookie`. |
| PDO models / SQL | `services/` facade → `mock` or `laravel` adapter | `*_API_MODE=mock|laravel`. The Laravel backend is **not** faked – see `API_CONTRACT.md`. |
| `lang/{locale}` + `lang/*.php` | `shared/i18n/{ar,en}.json`, cookie `tamrna_locale` | Same `/lang/{locale}` URL (route handler). Dashboard language is separate (`tamrna_admin_locale`). |
| `assets/`, `uploads/` | `web/public/assets`, `web/public/uploads`, `dashboard/public/assets` | Fonts, logos, product images preserved. |
| Roles (`store_manager`, `super_admin`) | `shared/constants/permissions.js` (`can(user, perm)`) | Used by `RequirePermission`, filtered nav, hidden actions. |

Shared code lives in `shared/` (`api`, `constants`, `i18n`, `icons`, `schemas`, `utils`, `mocks`, `components/Icon`).

## 2. Storefront routes

| PHP route | Controller | Next.js route | Notes |
| --- | --- | --- | --- |
| `GET /` | `HomeController::index` | `app/page.js` | Hero, sections, categories, featured products, newsletter. |
| `GET /catalog` | `CatalogController::catalog` | `app/catalog/page.js` | Filters/sort/pagination via query string (`lib/catalogParams.js`). |
| `GET /product/{slug}` | `productDetail` | `app/product/[slug]/page.js` | Variants, gallery, JSON-LD, reviews, related. |
| `GET /cart` | `CartController::index` | `app/cart/page.js` | Coupon + gift card, drawer shares the same store. |
| `GET/POST /checkout` | `CheckoutController` | `app/checkout/page.js` | Addresses, shipping calc, payment methods. |
| `GET /order/{n}` , `/checkout/success/{n}` | `orderConfirmation` | `app/order/[orderNumber]/page.js` | Success URL alias handled. |
| `/checkout/payment/callback/{provider}` | `paymentCallback` | `app/checkout/payment/callback/[provider]` | |
| `/checkout/payment/cancel`, `/checkout/simulator` | | `app/checkout/payment/cancel`, `app/checkout/simulator` | Payment simulator kept for mock mode. |
| `GET /gift-cards`, `/wishlist`, `/about`, `/contact` | `PageController` | same paths | |
| `GET /page/{slug}`, `/post/{slug}` | `show`, `showPost` | `app/page/[slug]`, `app/post/[slug]` | ACF-style fields (`hero_badge_text`, `show_support_card`, `key_features`). |
| `GET /login|register|forgot-password|verify-otp` | `AuthController` | same paths (auth layout) | RHF + Zod; OTP mock code `123456`. |
| `GET /logout` | | `app/logout/route.js` | |
| `GET /lang/{locale}` | closure | `app/lang/[locale]/route.js` | Sets cookie, redirects back. |
| `/profile`, `/profile/addresses|orders|order/{n}|gift-cards|notifications|settings` | `ProfileController` | `app/profile/**` | `/account/*` aliases kept. |
| `GET /admin`, `/admin/login` (on the storefront host) | | `app/admin/**` | Redirects staff to the dashboard app (`NEXT_PUBLIC_DASHBOARD_URL`). |
| `/schools`, `/schools/{slug}` | redirect → `/catalog` | redirect in `next.config.mjs` | |
| – | – | `sitemap.js`, `robots.js`, `not-found.js`, `error.js` | SEO + error pages (new, no visual change). |

PHP "AJAX" endpoints (`/api/cart/*`, `/api/wishlist/toggle`, `/api/checkout/calculate-shipping`, `/api/products`, `/api/variant`) are
now `services` methods (`cartService`, `catalogService`, …) used through TanStack Query / Zustand.

## 3. Dashboard routes

| PHP route | Role | Dashboard route | Permission key |
| --- | --- | --- | --- |
| `/admin` | store_manager | `/` | `dashboard.view` |
| `/admin/products`, `/create`, `/{id}/edit` | store_manager | `/products`, `/products/create`, `/products/:id/edit` | `products.*` |
| `/admin/categories` | store_manager (delete: super_admin) | `/categories` | `categories.*` |
| `/admin/warehouses` | store_manager (delete: super_admin) | `/warehouses` | `warehouses.*` |
| `/admin/orders`, `/admin/orders/{id}` | store_manager | `/orders`, `/orders/:id` | `orders.view` |
| `/admin/coupons` | super_admin | `/coupons` | `coupons.view` |
| `/admin/shipping-zones` | super_admin | `/shipping-zones` | `shipping.view` |
| `/admin/settings` (payments) | super_admin | `/settings` | `payments.view` |
| `/admin/site-settings` | super_admin | `/site-settings` | `site_settings.view` |
| `/admin/home-sections` (+ banners, features, testimonials, newsletter) | super_admin | `/home-sections` | `home_sections.view` |
| `/admin/menus` | super_admin | `/menus` | `menus.view` |
| `/admin/pages`, `/admin/posts` | super_admin | `/pages`, `/posts` (+ `/create`, `/:id/edit`) | `pages.*`, `posts.*` |
| `/admin/custom-fields` | super_admin | `/custom-fields` (+ `/create`, `/:id/edit`) | `custom_fields.*` |
| `/admin/users` | super_admin | `/users` | `users.view` |
| `/admin/translations` | super_admin | `/translations` | `translations.view` |
| `/admin/cache`, `/logs`, `/security`, `/backup` | super_admin | same paths | `cache.manage`, `logs.view`, `security.view`, `backup.view` |
| `/admin/login`, `/admin/lang/{l}` | – | `/login`, language switch in the top bar | – |

Menus, warehouses, posts, custom fields and logs were not in the PHP sidebar; they exist as screens so they are
reachable through the "extra" navigation entries.

## 4. Behaviour notes

* **RTL/LTR + AR/EN**: `dir`/`lang` set on `<html>` from the cookie; logical properties (`ms-*`, `ps-*`) in new Tailwind code.
* **Arabic numerals** (`foundation-digits.js`) → `ArabicDigits` client component; **scroll reveal** → `RevealOnScroll`.
* **Header modes** (immersive hero / auth layout / standard) are derived from the pathname.
* **Uploads**: mock mode stores data URLs; Laravel adapters send `FormData` (`POST` + `_method=PUT` for updates).
* **Validation**: Zod schemas in `shared/schemas` and `dashboard/src/schemas`, server (422) errors mapped back onto fields.
* **Errors**: everything becomes `ApiError`; `toFriendlyMessage` localises it. Business 4xx messages flagged `success:false` are shown as-is.
* **Rate limit**: mock login = 6 attempts / 5 min (as `AuthController`).

## 5. Known differences / follow-ups

1. Storefront and dashboard are different origins, so in **mock mode** each has its own browser database – dashboard edits do not show on the storefront until both point at the Laravel API.
2. Payment gateways (Paymob, Apple Pay, Mada…), Bosta waybills, SMS/OTP, backups and the IP firewall are **server concerns**; the screens manage settings only and the mock adapters simulate the responses.
3. PHP tests/scripts (`test_*.php`, `install.php`, `scripts/`) were intentionally not ported.
4. Dashboard bundle is code-split per route; the UI chunk (~330 kB) can be trimmed further once icons are tree-shaken per page.
