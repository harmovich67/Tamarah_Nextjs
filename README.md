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

### Tamrna backend (Postman collection `tomorona`) — dashboard

The dashboard is wired to the real backend for **login, categories, products and homepage banners** (`dashboard/.env.local`: `VITE_API_MODE=laravel`, `VITE_API_URL`).
Everything else (orders, coupons, settings, homepage sections…) has no endpoints in the collection yet, so it keeps running on mock data
while `VITE_MOCK_FALLBACK=true`; the list lives in `dashboard/src/services/index.js` (`NOT_IN_BACKEND`).

* Field translation (`en[name]`/`ar[name]`, media ids, variants) is in `dashboard/src/services/adapters/laravel/tamrna.js` and `store.js`.
* Login is `POST /admin/login { auth, password }`; the backend has no `/me` or `/refresh`, so the stored session is trusted until a 401.
* Images are uploaded first through `POST /general/attachment` (`model`: `Category` / `Product`), then the returned id is sent.
* Banners: title/badge/subtitle map to the backend `title`/`name`/`description` plus `placement`; the backend has no button text or link, so those fields are hidden in laravel mode. The live server had no `banners` table when checked (`GET /admin/banners` -> 500), so this part is only tested against a fake server until the backend runs its migrations.
* Lists are fetched twice (`Accept-Language: ar` and `en`) and merged, because the backend answers in one language per request.
* Not wired (no UI yet): category/product sort-order, product availability toggles, admin clients, gift cards, features, sections, system numbers, branches, contacts, and the whole storefront `/client/*` API (cart, favourites, gift cards…).
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
