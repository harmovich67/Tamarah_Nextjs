# Request to the backend: editable static pages (privacy, terms…)

Written for: the backend developer of `tomorna.doha.aait-d.com`.

## Why

The storefront has static pages (`/page/privacy`, `/page/terms`, …) whose text is bundled in the website. The dashboard
cannot change them because the backend has no endpoint for page content. Checked on the live server (no token):

| Route | Result |
|---|---|
| `GET /api/general/pages` | 200, only the keys `["privacy","about","terms","contact"]` (no content) |
| `/api/admin/pages`, `/api/admin/posts`, `/api/admin/menus` | 404 |
| `/api/client/pages`, `/api/client/pages/privacy` | 404 |

`about` and `contact` already have their own screens (`/client/about`, banners with `placement`), so the missing ones are
`privacy` and `terms` (and any page the admin wants to add).

## Requested routes (same conventions as the rest of the collection)

Admin (Bearer admin token, header `user_type: admin`; lists are paginated and answer in `Accept-Language`):

| Method | Route | Body / notes |
|---|---|---|
| GET | `/admin/pages?search=&filters[is_active]=` | rows: `id, slug, title, is_active, sort_order, updated_at` |
| GET | `/admin/pages/{id}` | full record incl. both languages |
| POST | `/admin/pages` | form-data below |
| POST | `/admin/pages/{id}` | same fields + `_method=put` |
| DELETE | `/admin/pages/{id}` | |
| POST | `/admin/pages/{id}/status` | toggles `is_active` |

Form-data (create / update):

```
slug                    unique, e.g. privacy / terms (the key from /general/pages)
en[title]  ar[title]
en[content] ar[content] long text / HTML
en[meta_title] ar[meta_title]               nullable
en[meta_description] ar[meta_description]   nullable
sort_order              nullable
is_active               1 | 0
```

Public (no token; localized by `Accept-Language`):

| Method | Route | Answer |
|---|---|---|
| GET | `/client/pages` | active pages: `slug, title` (for the footer links) |
| GET | `/client/pages/{slug}` | `id, slug, title, content, meta_title, meta_description, updated_at`; 404 when missing or inactive |

Errors as everywhere else: 422 with `data: { field: [messages] }`.

## What happens on our side once these exist

* Dashboard: the sidebar entry "Pages" gets a real screen (list, add, edit, hide, delete) built on the same generic
  resource screen as features / sections.
* Storefront: `/page/{slug}` reads `GET /client/pages/{slug}`; the bundled text stays as a fallback while a page has not
  been created yet.
