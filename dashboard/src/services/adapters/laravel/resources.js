import { apiClient as api, getAdminLocale } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';
import { fetchAll, fetchAllBilingual, isOn, listFilters, mediaList, mediaOf, tx, txPair, uploadMedia, withFormErrors } from './tamrna';

/**
 * Generic adapter for the simple admin resources of the Tamrna backend (gift cards, features, system numbers,
 * sections, branches, cities, clients, reviews, contacts). Every resource follows the same REST shape — `index` / `show`
 * / `POST create` / `POST update (_method=PUT)` / `DELETE` / `POST {id}/status` — with `en[...]` / `ar[...]` text blocks and
 * media ids for images, so one factory covers them all; the field lists live in `pages/resources/configs.js`.
 *
 * Field kinds:  text (plain value)  ·  bilingual (`<name>_ar` / `<name>_en` in the form, `en[name]` / `ar[name]` on the wire)
 *               image (one media id)  ·  images (a list of media ids)  ·  bool (is_active ...)
 */

/** Row for the screens: flat `<name>_ar` / `<name>_en`, plain values, `image` url + `image_id`, `images`. */
function toRow(raw, cfg) {
  const row = { id: raw.id, _raw: raw };
  for (const f of cfg.fields) {
    if (f.kind === 'bilingual') {
      const pair = txPair(raw, f.name);
      row[`${f.name}_ar`] = tx(raw, f.name, 'ar') || pair.ar;
      row[`${f.name}_en`] = tx(raw, f.name, 'en') || pair.en;
    } else if (f.kind === 'image') {
      const m = mediaOf(raw[f.name] ?? raw.media);
      row[f.name] = m?.url || '';
      row[`${f.name}_id`] = m?.id ?? null;
    } else if (f.kind === 'images') {
      const list = mediaList(raw[f.name]);
      row[f.name] = list.map((m) => m.url);
      row[`${f.name}_ids`] = list.map((m) => m.id);
    } else if (f.kind === 'bool') {
      row[f.name] = raw[f.name] === undefined ? f.default ?? true : isOn(raw[f.name]);
    } else if (f.kind === 'permissions') {
      // ids of the permissions a role holds; `permissions_known` is false when the list answer does not carry them
      const list = raw[f.name];
      row.permission_ids = Array.isArray(list) ? list.map((p) => String(p !== null && typeof p === 'object' ? p.id : p)) : [];
      row.permissions_known = Array.isArray(list);
    } else if (f.kind === 'relation') {
      // a related record (e.g. the city of a branch): its id for the form, its name for the table
      const rel = raw[f.name.replace(/_id$/, '')];
      row[f.name] = raw[f.name] ?? rel?.id ?? '';
      row[`${f.name.replace(/_id$/, '')}_name`] = typeof rel === 'object' && rel ? rel.name ?? '' : '';
    } else {
      row[f.name] = raw[f.name] ?? '';
    }
  }
  return cfg.toRow ? cfg.toRow(row, raw) : row;
}

async function toBody(values, cfg) {
  const body = {};
  for (const f of cfg.fields) {
    if (f.readOnly) continue;
    const v = values[f.name];
    if (f.kind === 'bilingual') {
      const ar = (values[`${f.name}_ar`] ?? '').toString().trim();
      const en = (values[`${f.name}_en`] ?? '').toString().trim() || ar;
      body.ar = { ...body.ar, [f.name]: ar };
      body.en = { ...body.en, [f.name]: en };
    } else if (f.kind === 'image') {
      if (v instanceof File) body[f.name] = await uploadMedia(v, { model: cfg.model, option: f.option || 'image' });
      else if (values[`${f.name}_id`] != null && values[`${f.name}_id`] !== '') body[f.name] = values[`${f.name}_id`];
    } else if (f.kind === 'images') {
      const ids = [...(values[`${f.name}_ids`] || [])];
      const existing = values[f.name] || [];
      const out = [];
      for (const item of existing) {
        if (item instanceof File) out.push(await uploadMedia(item, { model: cfg.model, option: f.option || 'image' }));
        else {
          const i = (values[`${f.name}_urls`] || []).indexOf(item);
          if (i >= 0 && ids[i] != null) out.push(ids[i]);
        }
      }
      body[f.name] = out;
    } else if (f.kind === 'bool') {
      body[f.name] = v ?? f.default ?? true;
    } else if (f.kind === 'permissions') {
      // `permissions[]`; an edit whose permissions were never loaded must not send an empty list (it would clear them)
      if (values.permissions_known !== false) body[f.name] = values.permission_ids || [];
    } else if (v !== undefined && v !== null && v !== '') {
      body[f.name] = v;
    }
  }
  return cfg.toBody ? cfg.toBody(body, values) : body;
}

/**
 * @param {{ path: { list: string, item: (id) => string }, status?: (id) => string, model: string, fields: any[], bilingualList?: boolean,
 *           actions?: Record<string, (id) => string>, readOnly?: boolean }} cfg
 */
export function makeResource(cfg) {
  const rows = async (filters) => {
    const params = listFilters(filters);
    const raw = cfg.bilingualList === false ? await fetchPlain(cfg.path.list, params) : await fetchAllBilingual(cfg.path.list, params);
    return raw.map((r) => toRow(r, cfg));
  };
  // `ar.title` -> `title_ar`, `images.0` -> `images` so React Hook Form can show the message next to the input.
  const errorMap = [
    [/^(ar|en)\.(\w+)$/, (_, l, f) => `${f}_${l}`],
    [/^(image|images)(\..*)?$/, (_, f) => f],
    ...(cfg.errorMap || []),
  ];
  const withErrors = (promise) => withFormErrors(promise, errorMap);

  return {
    list: rows,
    get: async (id) => toRow(unwrap(await api.get(cfg.path.item(id))), cfg),
    create: (values) => withErrors(toBody(values, cfg).then((body) => api.post(cfg.path.list, toFormData(body)).then((r) => unwrap(r)))),
    // Laravel cannot read multipart bodies on PUT: send POST with _method=PUT.
    update: (id, values) => withErrors(toBody(values, cfg).then((body) => api.post(cfg.path.item(id), toFormData({ ...body, _method: 'PUT' })).then((r) => unwrap(r)))),
    remove: async (id) => api.delete(cfg.path.item(id)),
    toggle: async (id) => (cfg.status ? unwrap(await api.post(cfg.status(id))) : null),
    /** Extra one-shot POST actions (`toggle-ban`, `update-hide`, `toggle-pickup`...). */
    action: async (name, id) => unwrap(await api.post(cfg.actions[name](id))),
  };
}

/** Single-language lists (the screens that only show numbers / names the backend already localizes). */
const fetchPlain = (path, params) => fetchAll(path, params);

/**
 * Backend settings. `GET /admin/settings` answers grouped (checked on the live server):
 * `{ social: { label, settings: [{ key, value, group, type, label, is_public }] }, business: {...} }`;
 * `POST /admin/settings` takes `settings[i][key]` / `settings[i][value]`.
 */
export const backendSettings = {
  async list() {
    const d = unwrap(await api.get(e.adminSettings));
    const groups = Array.isArray(d) ? [{ settings: d }] : Object.entries(d || {}).map(([key, g]) => ({ key, label: g?.label, settings: g?.settings || [] }));
    return groups
      .flatMap((g) => g.settings.map((r) => ({ ...r, groupLabel: g.label || r.group || g.key })))
      .filter((r) => r && r.key)
      .map((r) => ({ id: r.id, key: r.key, value: r.value ?? '', group: r.groupLabel || r.group || 'general', type: r.type || 'string', label: r.label || r.key, isPublic: r.is_public !== false, sort_order: r.sort_order ?? 0 }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.sort_order - b.sort_order);
  },
  /** @param {{ key: string, value: string }[]} changes */
  save: async (changes) => unwrap(await api.post(e.adminSettings, toFormData({ settings: changes }))),
};

/**
 * Roles hold `permissions[]`; the options for the checkboxes come from `GET /admin/permission-not-paginated`, which answers
 * grouped by module (checked on the live server): `{ "العملاء": [{ id, title }], "المدن": [...] }` in Accept-Language.
 */
function withPermissions(resource) {
  return {
    ...resource,
    permissionOptions: async () => {
      const d = unwrap(await api.get(e.permissionList, undefined, { headers: { 'Accept-Language': getAdminLocale() } }));
      const groups = Array.isArray(d) ? [['', d]] : Object.entries(d || {});
      return groups.flatMap(([group, list]) =>
        (Array.isArray(list) ? list : []).map((p) => ({ id: String(p.id), label: p.title || p.name || `#${p.id}`, group: group || p.module || 'general' })),
      );
    },
  };
}

// ------------------------------------------------------------------------------------------------ definitions
const R =(path) => ({ list: path.list, item: path.item });

export const resources = {
  giftCards: makeResource({
    path: R(e.giftCards),
    status: e.giftCardStatus,
    model: 'GiftCard',
    bilingualList: false,
    fields: [{ name: 'amount' }, { name: 'sort_order' }, { name: 'is_active', kind: 'bool' }],
  }),
  features: makeResource({
    path: R(e.features),
    status: e.featureStatus,
    model: 'Feature',
    fields: [
      { name: 'type' },
      { name: 'title', kind: 'bilingual' },
      { name: 'description', kind: 'bilingual' },
      { name: 'image', kind: 'image' },
      { name: 'sort_order' },
      { name: 'section_id' },
      { name: 'is_active', kind: 'bool' },
    ],
  }),
  systemNumbers: makeResource({
    path: R(e.systemNumbers),
    status: e.systemNumberStatus,
    model: 'SystemNumber',
    fields: [
      { name: 'number' },
      { name: 'title', kind: 'bilingual' },
      { name: 'description', kind: 'bilingual' },
      { name: 'image', kind: 'image' },
      { name: 'sort_order' },
      { name: 'is_active', kind: 'bool' },
    ],
  }),
  sections: makeResource({
    path: R(e.sections),
    model: 'Section',
    fields: [
      { name: 'type' },
      { name: 'title', kind: 'bilingual' },
      { name: 'description', kind: 'bilingual' },
      { name: 'images', kind: 'images' },
    ],
  }),
  branches: makeResource({
    path: R(e.branches),
    status: e.branchStatus,
    model: 'Branch',
    actions: { pickup: e.branchTogglePickup },
    fields: [
      { name: 'city_id', kind: 'relation' },
      { name: 'name', kind: 'bilingual' },
      // The public answer has `phone` / `opening_hours` but the backend ignores them on create / update (checked on the
      // live server: both stay null), so the form does not offer them.
      { name: 'address' },
      { name: 'longitude' },
      { name: 'latitude' },
      { name: 'pickup_enabled', kind: 'bool', default: true },
      { name: 'is_active', kind: 'bool' },
    ],
  }),
  cities: makeResource({
    path: R(e.cities),
    status: e.cityStatus,
    model: 'City',
    actions: { privateDelivery: e.cityPrivateDelivery },
    fields: [
      { name: 'country_id' },
      { name: 'name', kind: 'bilingual' },
      { name: 'is_active', kind: 'bool' },
    ],
    // Cities answer `status` (1 / 0) instead of `is_active`, plus `has_private_delivery` (checked on the live server).
    toRow: (row, raw) => ({ ...row, is_active: raw.is_active === undefined ? isOn(raw.status ?? 1) : isOn(raw.is_active), private_delivery: isOn(raw.has_private_delivery) }),
  }),
  clients: makeResource({
    path: R(e.clients),
    model: 'Client',
    readOnly: true,
    actions: { ban: e.clientToggleBan },
    bilingualList: false,
    fields: [{ name: 'first_name' }, { name: 'last_name' }, { name: 'full_name' }, { name: 'email' }, { name: 'phone' }, { name: 'is_active', kind: 'bool' }],
    // `toggle-ban` flips a ban flag whose name the collection does not show: read the usual candidates.
    toRow: (row, raw) => ({
      ...row,
      name: raw.full_name || raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(' '),
      phone: [raw.phone_code, raw.phone].filter(Boolean).join(' '),
      is_banned: isOn(raw.is_banned ?? raw.banned ?? raw.is_ban) || !!raw.banned_at || raw.is_active === false || raw.is_active === 0,
    }),
  }),
  reviews: makeResource({
    path: R(e.reviews),
    model: 'Review',
    readOnly: true,
    actions: { hide: e.reviewHide },
    bilingualList: false,
    fields: [{ name: 'comment' }, { name: 'rate' }],
    toRow: (row, raw) => ({
      ...row,
      client_name: raw.client?.full_name || raw.client?.name || [raw.client?.first_name, raw.client?.last_name].filter(Boolean).join(' ') || raw.user?.name || '',
      order_number: raw.order?.order_number ?? raw.order_id ?? '',
      is_hidden: isOn(raw.is_hidden ?? raw.hidden ?? raw.hide),
    }),
  }),
  notifications: makeResource({
    path: R(e.adminNotifications),
    model: 'Notification',
    fields: [
      { name: 'title', kind: 'bilingual' },
      { name: 'body', kind: 'bilingual' },
      { name: 'type' },
    ],
    // `POST /admin/notifications/sender`: content[ar|en][title|body] + type (the collection sends nothing else; no `ids` = everyone).
    toBody: (body, values) => ({ content: { ar: body.ar, en: body.en }, type: values.type || 'client' }),
    toRow: (row, raw) => ({
      ...row,
      title_ar: row.title_ar || raw.content?.ar?.title || '',
      title_en: row.title_en || raw.content?.en?.title || '',
      body_ar: row.body_ar || raw.content?.ar?.body || '',
      body_en: row.body_en || raw.content?.en?.body || '',
      type: raw.type ?? 'client',
      created_at: String(raw.created_at ?? '').slice(0, 16),
    }),
  }),
  roles: withPermissions(
    makeResource({
      path: R(e.roles),
      model: 'Role',
      errorMap: [[/^permissions(\..*)?$/, () => 'permission_ids']],
      fields: [
        { name: 'name', kind: 'bilingual' },
        { name: 'permissions', kind: 'permissions' },
      ],
    }),
  ),
  contacts: makeResource({
    path: R(e.contacts),
    model: 'Contact',
    readOnly: true,
    bilingualList: false,
    fields: [{ name: 'full_name' }, { name: 'email' }, { name: 'content' }],
  }),
};
