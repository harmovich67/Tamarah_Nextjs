# API contract (expected Laravel backend)

The front-ends are finished against **mock adapters**. When the Laravel API exists, set `*_API_MODE=laravel` and
`*_API_URL`; the `laravel` adapters (`web/services/adapters/laravel`, `dashboard/src/services/adapters/laravel`) call the
endpoints below through the single `apiClient` (`shared/api/apiClient.js`). The path constants are declared once in
`web/services/endpoints.js` and `dashboard/src/services/endpoints.js` – change a path there and nothing else.

> This is a **contract proposal**, not documentation of an existing server. No Laravel code is faked in this repo.

## 1. Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `NEXT_PUBLIC_API_URL` / `VITE_API_URL`, e.g. `https://api.example.com/api`. |
| Format | JSON (`Accept: application/json`). File uploads use `multipart/form-data`; updates with files are sent as `POST` + `_method=PUT`. |
| Locale | `Accept-Language: ar|en` on every request. |
| Success envelope | `{ "success": true, "data": <payload>, "message"?: "…" }` – the client unwraps `data`. A bare payload is also accepted. |
| Error envelope | `{ "success": false, "message": "…", "errors"?: { "field": ["msg"] } }` with the proper status. |
| Pagination | Laravel paginator (`data`, `meta.current_page|per_page|total|last_page`) or `{ items, meta }` – normalised by `normalizePaginated`. Query: `page`, `per_page`. |
| Dates / money | ISO-8601 strings; money as decimal numbers in SAR. |
| IDs | integers (orders are also addressed by `order_number`). |

### Statuses the client reacts to
`401` → clears the session and redirects to login (`onUnauthorized`) · `403` → "forbidden" page/toast · `404` → not-found state ·
`409` → conflict toast · `422` → field errors (`errors`) mapped by React Hook Form · `429` → rate-limit message (login: 6 / 5 min) · `5xx` → generic message.
A `401` carrying `success:false` + `message` (e.g. wrong password) shows that message instead of "session expired".

### Authentication
* **Token** (`*_AUTH_STRATEGY=token`): `POST /auth/login` returns `{ token, user }`; sent as `Authorization: Bearer <token>`. Stored via `safeStorage` (`tamrna.web.*`, `tamrna.admin.*`).
* **Cookie** (`cookie`): Sanctum SPA – the client first calls `GET {origin}/sanctum/csrf-cookie`, then sends `X-XSRF-TOKEN` with `credentials: include`.
* Dashboard routes require a user whose role is `store_manager` or `super_admin`; the **server must enforce the same matrix** (`shared/constants/permissions.js`).

User shape: `{ id, name, email, phone, status, role_name: 'customer'|'store_manager'|'super_admin', role_ar, role_en, avatar? }`.

## 2. Storefront endpoints (`NEXT_PUBLIC_API_URL`)

| Method | Path | Purpose / PHP origin |
| --- | --- | --- |
| GET | `/storefront/shell` | Settings + header/footer menus + categories (`layouts/app.php`). |
| GET | `/storefront/settings` | Public site settings. |
| GET | `/storefront/home` | Sections, banners, features, testimonials, featured products. |
| GET | `/storefront/pages/{slug}` · `/storefront/posts/{slug}` | CMS page/post incl. `fields` (ACF values). |
| GET | `/storefront/sitemap` | URLs for `sitemap.xml`. |
| POST | `/storefront/newsletter` · `/storefront/contact` | `{ email }` · `{ name, email, phone?, message }`. |
| GET | `/catalog` | Query `q, category, min_price, max_price, sort, page` → paginated products + filters. |
| GET | `/catalog/products/{slug}` | Product with variants, gallery, related, reviews. |
| GET | `/catalog/products?ids=1,2` | Wishlist hydrate. |
| GET / DELETE | `/cart` | Current cart (lines, totals, coupon, gift cards) / clear. |
| POST / PATCH / DELETE | `/cart/items`, `/cart/items/{key}` | add `{variant_id, quantity}` / set quantity / remove. |
| POST / DELETE | `/cart/coupon` | `{ code }` / remove. |
| POST | `/cart/gift-cards` | Add a gift card line. |
| GET | `/checkout` | Cities, payment methods, saved addresses, totals. |
| POST | `/checkout/shipping` | `{ city }` → `{ fee, eta }`. |
| POST | `/checkout/orders` | Place order → `{ order_number, payment: { redirect_url? } }`. |
| GET/POST | `/checkout/payment/verify` | Provider callback verification. |
| GET | `/orders/{order_number}` | Order confirmation. |
| POST | `/auth/login` · `/auth/login/otp` · `/auth/register` | Password / OTP login, registration. |
| POST | `/auth/otp/verify` · `/auth/otp/resend` · `/auth/forgot-password` | OTP flows. |
| POST | `/auth/logout` · `/auth/refresh` · GET `/auth/me` | Session. |
| GET | `/account` | Overview (profile, counts). |
| PUT | `/account/profile` · `/account/password` · `/account/preferences` (GET too) | |
| GET/POST/PUT/DELETE | `/account/addresses[/{id}]`, POST `/account/addresses/{id}/default` | |
| GET | `/account/orders`, `/account/orders/{number}`; POST `/account/orders/{number}/cancel` | |
| GET | `/account/gift-cards`, `/account/notifications`; POST `…/{id}/read`, `…/read-all` | |
| GET / POST | `/account/wishlist`, `/account/wishlist/toggle` | |

## 3. Dashboard endpoints (`VITE_API_URL`, all authenticated)

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/admin/auth/login` · `/admin/auth/logout` · `/admin/auth/refresh`; GET `/admin/auth/me` | – | Login body `{ identity, password }` (email or Saudi mobile). |
| GET | `/admin/dashboard` | store_manager | KPIs, latest orders, low-stock list, revenue series. |
| GET/POST | `/admin/products` | store_manager | List (`q,status,category,page`) / create (multipart, variants). |
| GET/POST(`_method=PUT`)/DELETE | `/admin/products/{id}` | store_manager | |
| GET | `/admin/products/options` | store_manager | Categories + warehouses for the form. |
| POST | `/admin/variants/{id}/stock` | store_manager | `{ stock }` → `{ stock }` (`/api/admin/stock/update`). |
| CRUD | `/admin/categories`, `/admin/warehouses` | store_manager (DELETE: super_admin) | |
| GET | `/admin/orders`, `/admin/orders/{id}` | store_manager | Filters `q,status,payment_status`. |
| PATCH | `/admin/orders/{id}/status` | store_manager | `{ status, payment_status? }`. |
| POST | `/admin/orders/{id}/waybill` | store_manager | Creates a courier waybill. |
| CRUD + POST `…/{id}/toggle` | `/admin/coupons` | super_admin | `{ code, discount_type: percentage|fixed, discount_value, min_order_amount, usage_limit, start_date, end_date, is_active }`. |
| CRUD + POST `…/{id}/toggle` | `/admin/shipping-zones` | super_admin | |
| GET / PUT | `/admin/settings/payments` | super_admin | Payment methods + keys (secrets masked on read). |
| POST | `/admin/settings/payments/test-connection` | super_admin | `{ provider }` → `{ success, message }`. |
| GET / POST(`_method=PUT`) | `/admin/settings/site` | super_admin | Logo upload + store identity. |
| GET/POST/PUT/DELETE | `/admin/home-sections[/{id}]`, POST `…/{id}/move|toggle`, PUT `/admin/home-sections/features|testimonials|newsletter` | super_admin | |
| CRUD + `move`, `toggle` | `/admin/banners` | super_admin | |
| CRUD | `/admin/menus` | super_admin | |
| CRUD | `/admin/pages`, `/admin/posts`; POST `/admin/pages/{id}/status` | super_admin | Include `fields` (ACF values). |
| CRUD | `/admin/custom-fields`; GET `/admin/custom-fields/targets` | super_admin | Group `{ title, key_name, target_type: page|post|product|category, target_filter, fields: [{ name, label, type, options, required }] }`. |
| CRUD | `/admin/users` | super_admin | |
| GET / PUT / DELETE | `/admin/translations`, `/admin/translations/{key}` | super_admin | `{ key, ar, en }` overrides. |
| GET / POST | `/admin/cache`, `/admin/cache/clear` (`{ group }`), `/admin/cache/preload` | super_admin | |
| GET / DELETE | `/admin/logs` (`level,channel,q,limit`), GET `/admin/logs/download` | super_admin | Download returns a file. |
| GET / PUT | `/admin/security`, `/admin/security/settings`; POST `/admin/security/blocked-ips`; DELETE `/admin/security/blocked-ips/{ip}` | super_admin | |
| GET/POST/DELETE | `/admin/backups[/{name}]`, GET `…/{name}/download`, POST `/admin/backups/restore`, PUT `/admin/backups/settings` | super_admin | |

Representative payloads (the mock adapters under `shared/mocks` + `services/adapters/mock` are the executable reference for every field):

```jsonc
// POST /admin/auth/login → 200
{ "success": true, "data": { "token": "…", "user": { "id": 1, "name": "…", "role_name": "super_admin" } } }

// POST /admin/coupons → 422
{ "success": false, "message": "The given data was invalid.", "errors": { "code": ["Coupon code already exists."] } }

// GET /admin/logs?level=error → 200
{ "success": true, "data": { "logs": [{ "id": 1, "level": "error", "channel": "app", "message": "…", "context": {}, "created_at": "2026-10-13 10:00:00" }],
  "stats": { "total_events": 120, "errors_count": 3, "warnings_count": 9, "security_count": 14, "total_size_formatted": "42 KB" }, "channels": ["app", "auth", "security"] } }
```

## 4. Backend checklist
1. Sanctum (token or SPA cookie), CORS for both front-end origins with credentials when using cookies.
2. Role middleware equal to the PHP route matrix; return `403` JSON, never HTML.
3. Rate-limit `/auth/login` and OTP endpoints (429).
4. Mask payment secrets on read; never echo them back.
5. Serve images/uploads from a public disk and return absolute or `/uploads/...` URLs.
