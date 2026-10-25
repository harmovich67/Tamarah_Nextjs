# Tamrna — modern storefront + admin dashboard

Migration of the legacy PHP application (`../alaz`) to:

| Package | Stack | Port |
| --- | --- | --- |
| `web/` | Next.js (App Router), JavaScript, Tailwind, React Hook Form, Zod, TanStack Query, Zustand, Framer Motion, lucide-react, date-fns, Sonner | 3000 |
| `dashboard/` | React + Vite, JavaScript, React Router, Tailwind, TanStack Query, Zustand, RHF, Zod, Framer Motion, lucide-react, Recharts, date-fns, Sonner | 5173 |
| `shared/` | API client, errors, i18n (AR/EN), permissions, schemas, icons, mock database | – |

Visual parity with the PHP original is the priority (same routes, classes, RTL/LTR, Arabic/English, fonts and assets).
No TypeScript. No fake backend: until a Laravel API exists everything runs on **mock adapters**.

## Quick start

```bash
npm install                 # installs all workspaces
npm run dev:web             # http://localhost:3000
npm run dev:dashboard       # http://localhost:5173
npm run build               # production build of both apps
```

Node ≥ 20.9. Copy `web/.env.example` → `web/.env.local` and `dashboard/.env.example` → `dashboard/.env.local` to change settings.

### Demo accounts (mock mode)

| Role | Login | Password |
| --- | --- | --- |
| super_admin | `admin@tumurna.com` | `Admin@12345` |
| store_manager | `manager@tumurna.com` | `Manager@12345` |
| customer | `demo@tamrna.test` | `Tmrna2026` |

OTP demo code: `123456`. Staff signing in on the storefront are redirected to the dashboard. The `/login` page of the
dashboard has a "fill demo data" button.

## Environment variables

| Variable (web / dashboard) | Values | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_MODE` / `VITE_API_MODE` | `mock` (default) \| `laravel` | Adapter used by the `services/` facade. |
| `NEXT_PUBLIC_API_URL` / `VITE_API_URL` | URL | Laravel base URL (`…/api`). |
| `NEXT_PUBLIC_AUTH_STRATEGY` / `VITE_AUTH_STRATEGY` | `token` \| `cookie` | Sanctum personal token or SPA cookie. |
| `NEXT_PUBLIC_SITE_URL` | URL | Canonical URL, sitemap, Open Graph. |
| `NEXT_PUBLIC_DASHBOARD_URL` / `VITE_STOREFRONT_URL` | URL | Cross links between the two apps. |

## Connecting Laravel — guided wizard

```bash
npm run connect                                   # interactive, step by step
npm run connect -- --spec path/to/api.json        # start from the backend's API file
npm run connect -- --check                        # re-run only the live checks
npm run connect -- --reset                        # back to mock mode
```

Give it the backend's **OpenAPI/Swagger (json/yaml)**, a **Postman collection**, or the output of
`php artisan route:list --json`. It then:

1. matches every endpoint the apps call against the backend routes (detects the `/api/v1` prefix, renamed segments, missing routes);
2. writes `*/.env.local` (mode, URL, auth strategy) and `endpoints.overrides.json` for every path that differs — no source edits;
3. probes the live server: reachability, JSON/envelope, CORS preflight, Sanctum cookie, login, and the shape of the main responses;
4. writes `docs/CONNECT_REPORT.md` — a hand-off for the backend developer (missing endpoints, method mismatches, field-name differences).

Existing files get a `.bak` copy. Details of what the backend must provide are in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

### Tamrna backend — storefront (`web/`)

With `NEXT_PUBLIC_API_MODE=laravel` (`web/.env.local`) the storefront runs on the real backend (`web/services/adapters/tamrna/`, wired in `web/services/index.js`):

* **Catalog, product pages, home products / categories / hero slides** (`/client/products`, `/client/departments`, `/client/home` banners; demo slides stay when no banner is published) and the **guest cart** (`/client/cart*`).
* **Sign-in and accounts** (`auth.js`): login `POST /client/login` (mobile + password, `?guest_token` merges the guest cart), registration + OTP (`/client/register`, `/client/verify`, `/client/resend-otp`), forgot password (`/client/forget-password` → `/client/reset-password`; the form asks for the new password up front because the backend takes it with the first request), logout. There is no "sign in with a code only" flow.
* **Verification code**: the backend's code is 4–6 digits (the collection shows `1111` and `111111`), so the screen accepts 4–6 digits and auto-submits at six. A wrong code shows the backend's own message (HTTP 422 `{ success:false, message }`, e.g. "Account does not exist"). The *Change mobile number* link opens a one-field form (`POST /client/change-phone-before-verify`): the registration data stays, a new code goes to the new number. The registration form has a country-code select, Saudi Arabia (+966) selected by default.
* **Errors**: the backend sends validation errors as `data: { field: [messages] }`; `shared/api/apiClient.js` reads them, so forms mark the right inputs (dashboard and storefront). A 422 with only a `message` now shows that message instead of a generic one.
* **Gift card page**: preset amounts come from `GET /client/gift-cards`; the setting `accept_gift_card_amount` (from `GET /general/settings`, editable under *Store settings* in the dashboard) shows / hides the "Other value" button (shown while the setting does not exist). Public settings `phone`, `whats_app`, `support_email` feed the footer / contact page when filled. *My gift cards* reads `GET /client/my-gift-cards`.
* **Notifications**: the collection only has `GET /general/notifications` and "read all" (`PUT /general/notifications`), so opening one notification marks them all as read. Admins send notifications from the dashboard (*Send notifications*, `POST /admin/notifications/sender`: title + text in both languages, `type=client`).
* **Account** (`account.js`): profile + password (`/client/profile`), addresses (`/client/addresses`, cities from `GET /general/cities`), orders (`/client/orders`), favourites (`/client/favorites`), notifications (`/general/notifications`), order reviews (`POST /client/reviews`, shown on delivered orders).
* **Checkout** (`checkout.js`): `POST /client/orders/checkout { address_id, delivery_type }`; sign-in is required. The backend has no payment, shipping-quote or single-order endpoint, so the only payment method is "pay on delivery / at the branch", the shipping fee is shown once the order exists, and an order is looked up in the customer's order list. Gift cards are sent straight away with `POST /client/gift-cards`.
* Still on demo data: coupons, menus, settings, newsletter, customer-side order cancellation (no endpoint), received gift cards, preferences (kept in the browser).
* **About page**: story, principles, numbers, sustainability and commitment come from `GET /client/about` (`getAbout` in `tamrna/index.js`); the bundled copy fills any section the backend leaves empty. `GET /client/departments` and `GET /client/gift-cards` (preset amounts, matched by amount when sending a card) work again since the backend added `banners.sort_order` (checked 2026-10-20); the contact form answered 200 in Postman after that fix.
* Response shapes of the authenticated endpoints were **not verified** against the live server (the collection has no examples): fields are read through candidate lists (`pick(...)` in `http.js`); if a screen shows blanks compare the real JSON with them.
* Product URLs are `/product/<id>-<slug>` (the backend slug is not unique); product list / categories are cached 30 s per server process.

### Tamrna backend (Postman collection `tomorona`) — dashboard

The dashboard is wired to the real backend for **login, categories, products, homepage banners, orders and the home KPIs** (`dashboard/.env.local`: `VITE_API_MODE=laravel`, `VITE_API_URL`).
Everything else (warehouses, coupons, settings, homepage sections…) has no endpoints in the collection yet, so it keeps running on mock data
while `VITE_MOCK_FALLBACK=true`; the list lives in `dashboard/src/services/index.js` (`NOT_IN_BACKEND`).

* Field translation (`en[name]`/`ar[name]`, media ids, variants) is in `dashboard/src/services/adapters/laravel/tamrna.js` and `store.js`.
* Login is `POST /admin/login { auth, password }`; the backend has no `/me` or `/refresh`, so the stored session is trusted until a 401.
* Images are uploaded first through `POST /general/attachment` (`model`: `Category` / `Product`), then the returned id is sent.
* Banners: title/badge/subtitle map to the backend `title`/`name`/`description` plus `placement`; the backend has no button text or link, so those fields are hidden in laravel mode. Checked on the live server (2026-10-18): the backend rejects an update without `image` and **deletes the current image when its own id is sent back**, so editing a banner requires choosing a new image (the dashboard enforces it).
* Product stock: the form sends `is_box` and either a product-level `stock` (`is_box = 0`) or `variants[i][stock]` (`is_box = 1`), as in the Postman collection. The live backend currently ignores all three (they come back `null`, even with a raw curl), so stock is not saved until the backend implements it. Banner `name` / `description` are stored as `null` on create for the same reason.
* Orders (`dashboard/src/services/adapters/laravel/orders.js`): `GET /admin/orders` (+ `/{id}`), and the status moves through one POST per step — `process`, `ready`, `deliver`, `complete`, `cancel` — mapped to the five shipping statuses of the order screen (pending = process, processing = ready, shipped = deliver, delivered = complete). The backend has no payment-status or waybill endpoint, so those controls are hidden in laravel mode. KPIs come from `GET /admin/home?date_filter=all|today|week|month|year|custom`.
* **Not verified against the live server**: the collection has no response examples, so the order / KPI field names are read through candidate lists (`pick([...])` in `orders.js`). If the orders screen or the home KPIs show blanks, compare the real JSON with those lists.
* Collection quirk: the product `availability` request posts to `/admin/products/{id}/published` (same URL as "toggle published"), so there is no separate availability endpoint to wire yet.
* List filters: the list endpoints accept `?search=` and `?filters[is_active]=0|1` (categories, products, banners; orders take `filters[status]`, `filters[payment_status]`, `filters[delivery_type]`). The adapters expose them (`listCategories({ search, is_active })`, `listProducts({ cat, search, is_active })`, `listBanners(...)`, `listOrders({ status, ... })`) but send nothing by default, so the screens still get every row and filter client side.
* Lists are fetched twice (`Accept-Language: ar` and `en`) and merged, because the backend answers in one language per request.
* Generic backend screens (laravel mode only, sidebar group "Store data (backend)"): clients (search / ban / delete), reviews (hide / delete), gift cards, branches (+ toggle pickup), cities (+ private delivery), features, content sections, system numbers and contact messages. One factory (`services/adapters/laravel/resources.js`) and one screen (`pages/resources/ResourcePage.jsx`, fields in `pages/resources/configs.jsx`) serve all of them. Orders can also be deleted from the order page.
* **Users & roles** screen (`/users`): admin accounts from `/admin/admins` (create / edit / delete, status via `POST {id}/status`) and roles from `/admin/role-not-paginated`. The **Roles & permissions** screen (`/roles`) creates / edits / deletes roles (`/admin/roles`, `en[name]` / `ar[name]`, `permissions[]`) with the checkbox list from `/admin/permission-not-paginated`; the response shape of both is read defensively (unverified: an edit whose list answer carries no `permissions` does not send them, so it cannot clear them). `user_name` on create is derived from the email (the collection's create form asks for it). The collection's `/admin/cart/*` routes mirror the storefront cart and are not used.
* Not wired: category / product sort-order UI, product `status` and variant `toggle-discount` switches, media delete / `models/list`, `/general` change-lang.
* The collection has no response examples, so list/show shapes are read defensively (`ar`/`en` blocks, `translations`, `name_ar`, or the plain localized value). If a screen shows blanks, compare the real response with `tamrna.js`.
* The backend must allow CORS from `http://localhost:5173`.

### Manual connection

1. Implement the endpoints in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).
2. Set `*_API_MODE=laravel`, `*_API_URL`, `*_AUTH_STRATEGY` (and CORS / Sanctum on the server).
3. If a path differs, edit `services/endpoints.overrides.json`; if a payload or field name differs, edit the matching file in `services/adapters/laravel/`.
   Pages, hooks and components never touch `fetch`.

## Structure

```
shared/        api/ (client, errors, storage) · constants/ (permissions) · i18n/ · schemas/ · mocks/ · icons/
web/           app/ (routes) · components/ · features/ · services/ (facade, endpoints, adapters) · lib/ · styles/legacy/
dashboard/     src/pages · src/components/ui · src/services · src/store · src/hooks · src/routes · src/layouts
docs/          API_CONTRACT.md · MIGRATION_MAP.md
```

* **Service layer** – `services/index.js` picks `mock` or `laravel`; UI imports only the facade.
* **Errors** – every failure is an `ApiError`; `toFriendlyMessage()` localises it; loading / empty / error states are built into `DataTable`, `EmptyState`, `ErrorState`.
* **Permissions** – `can(user, 'orders.view')`, `RequirePermission`, navigation filtered per role; the server must enforce the same rules.
* **i18n** – storefront locale in cookie `tamrna_locale` (`/lang/ar|en`), dashboard locale in `tamrna_admin_locale` (independent).
* **Accessibility / SEO** – semantic landmarks, labelled controls, focus-visible styles, dialogs with focus handling, metadata, JSON-LD, sitemap, robots.

## Mock-mode caveats
* Each app has its own browser database (`localStorage`, namespaces `tamrna-web` / `tamrna-admin`), so dashboard changes do not appear on the storefront until both use the real API.
* Payment, SMS/OTP, courier, backups and the IP firewall are simulated.
* "Reset demo data": clear site data for the origin (or bump `DB_VERSION` in `shared/mocks/mockDb.js`).

## Docs
* [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) – endpoints, envelopes, auth, errors.
* [`docs/MIGRATION_MAP.md`](docs/MIGRATION_MAP.md) – PHP → modern mapping of every route/screen.
