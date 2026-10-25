import { Badge } from '@/components/ui';

/**
 * Screens of the simple Tamrna admin resources (see services/adapters/laravel/resources.js for the API side). Each entry
 * feeds the generic `ResourcePage`:
 *   service     key of `resourceService`
 *   fields      form inputs: { name, label:[ar,en], type: text | number | textarea | select | switch | bilingual | image | images,
 *                              options?, optionsFrom?, required?, hint? }
 *   columns     table: { key, header:[ar,en], cell(row, { tr, locale }) }
 *   toggle      the row has a `POST /{id}/status` switch
 *   filter      server-side `filters[<name>]` select above the table
 *   rowActions  extra one-shot POST actions: { name, label:[ar,en], icon, tone?, show?(row) }
 */

const yesNo = (v, tr) => <Badge tone={v ? 'green' : 'stone'}>{v ? tr('نعم', 'Yes') : tr('لا', 'No')}</Badge>;
const loc = (row, name, locale) => (locale === 'en' ? row[`${name}_en`] || row[`${name}_ar`] : row[`${name}_ar`] || row[`${name}_en`]);
const clip = (s, n = 90) => (String(s || '').length > n ? `${String(s).slice(0, n)}…` : s || '');

const TYPES_FEATURE = ['home', 'principles', 'about', 'story', 'future'];

const thumb = (src) =>
  src ? <img src={src} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white" loading="lazy" /> : <span className="text-slate-300">—</span>;

export const RESOURCE_PAGES = {
  'gift-cards': {
    service: 'giftCards',
    icon: 'gift',
    title: ['بطاقات الهدايا', 'Gift cards'],
    subtitle: ['القيم الجاهزة التي يختار منها العميل عند إهداء بطاقة', 'Preset amounts customers choose from when sending a gift card'],
    searchText: (r) => String(r.amount),
    toggle: true,
    fields: [
      { name: 'amount', label: ['القيمة (ر.س)', 'Amount (SAR)'], type: 'number', required: true },
      { name: 'sort_order', label: ['الترتيب', 'Sort order'], type: 'number' },
      { name: 'is_active', label: ['فعّالة', 'Active'], type: 'switch' },
    ],
    columns: [
      { key: 'amount', header: ['القيمة', 'Amount'], sortValue: (r) => Number(r.amount), cell: (r) => <b className="text-primary-700">{Number(r.amount)}</b> },
      { key: 'sort', header: ['الترتيب', 'Order'], sortValue: (r) => Number(r.sort_order), cell: (r) => r.sort_order },
    ],
  },

  features: {
    service: 'features',
    icon: 'sparkles',
    title: ['المميزات', 'Features'],
    subtitle: ['نقاط القوة والمبادئ التي تظهر في الصفحة الرئيسية وصفحة من نحن', 'Highlights and principles shown on the home and about pages'],
    searchText: (r) => `${r.title_ar} ${r.title_en} ${r.description_ar}`,
    toggle: true,
    filter: { name: 'type', label: ['النوع', 'Type'], options: TYPES_FEATURE.map((v) => [v, v]) },
    fields: [
      { name: 'type', label: ['النوع', 'Type'], type: 'select', options: TYPES_FEATURE.map((v) => [v, v]), required: true },
      { name: 'title', label: ['العنوان', 'Title'], type: 'bilingual', required: true },
      { name: 'description', label: ['الوصف', 'Description'], type: 'bilingual-area' },
      { name: 'image', label: ['الصورة', 'Image'], type: 'image' },
      { name: 'section_id', label: ['رقم القسم (اختياري)', 'Section id (optional)'], type: 'number' },
      { name: 'sort_order', label: ['الترتيب', 'Sort order'], type: 'number' },
      { name: 'is_active', label: ['فعّال', 'Active'], type: 'switch' },
    ],
    columns: [
      { key: 'image', header: ['الصورة', 'Image'], cell: (r) => thumb(r.image) },
      { key: 'title', header: ['العنوان', 'Title'], sortValue: (r) => r.title_ar, cell: (r, { locale }) => <b>{loc(r, 'title', locale)}</b> },
      { key: 'type', header: ['النوع', 'Type'], sortValue: (r) => r.type, cell: (r) => <Badge tone="gold">{r.type}</Badge> },
      { key: 'description', header: ['الوصف', 'Description'], hideOnMobile: true, cell: (r, { locale }) => <span className="text-slate-500 text-xs">{clip(loc(r, 'description', locale))}</span> },
    ],
  },

  'system-numbers': {
    service: 'systemNumbers',
    icon: 'hash',
    title: ['أرقام النظام', 'System numbers'],
    subtitle: ['الأرقام والإحصائيات المعروضة في الموقع (سنوات الخبرة، عدد العملاء…)', 'Figures shown on the website (years of experience, customers…)'],
    searchText: (r) => `${r.number} ${r.title_ar} ${r.title_en}`,
    toggle: true,
    fields: [
      { name: 'number', label: ['الرقم / الموضع', 'Number / placement'], type: 'text', required: true, hint: ['مثال: principles أو home أو about', 'e.g. principles, home or about'] },
      { name: 'title', label: ['العنوان', 'Title'], type: 'bilingual', required: true },
      { name: 'description', label: ['الوصف', 'Description'], type: 'bilingual-area' },
      { name: 'image', label: ['الصورة', 'Image'], type: 'image' },
      { name: 'sort_order', label: ['الترتيب', 'Sort order'], type: 'number' },
      { name: 'is_active', label: ['فعّال', 'Active'], type: 'switch' },
    ],
    columns: [
      { key: 'image', header: ['الصورة', 'Image'], cell: (r) => thumb(r.image) },
      { key: 'number', header: ['الرقم', 'Number'], sortValue: (r) => r.number, cell: (r) => <b className="font-mono">{r.number}</b> },
      { key: 'title', header: ['العنوان', 'Title'], sortValue: (r) => r.title_ar, cell: (r, { locale }) => loc(r, 'title', locale) },
    ],
  },

  sections: {
    service: 'sections',
    icon: 'layout-panel-top',
    title: ['أقسام المحتوى', 'Content sections'],
    subtitle: ['قصتنا ومستقبلنا والتزامنا: نص وصور لكل قسم', 'Our story, future and commitment: text and images per section'],
    searchText: (r) => `${r.type} ${r.title_ar} ${r.title_en}`,
    fields: [
      { name: 'type', label: ['النوع', 'Type'], type: 'select', options: [['story', 'story'], ['future', 'future'], ['commitment', 'commitment']], required: true },
      { name: 'title', label: ['العنوان', 'Title'], type: 'bilingual', required: true },
      { name: 'description', label: ['الوصف', 'Description'], type: 'bilingual-area' },
      { name: 'images', label: ['الصور', 'Images'], type: 'images' },
    ],
    columns: [
      { key: 'image', header: ['الصورة', 'Image'], cell: (r) => thumb(r.images?.[0]) },
      { key: 'type', header: ['النوع', 'Type'], sortValue: (r) => r.type, cell: (r) => <Badge tone="gold">{r.type}</Badge> },
      { key: 'title', header: ['العنوان', 'Title'], sortValue: (r) => r.title_ar, cell: (r, { locale }) => <b>{loc(r, 'title', locale)}</b> },
      { key: 'description', header: ['الوصف', 'Description'], hideOnMobile: true, cell: (r, { locale }) => <span className="text-slate-500 text-xs">{clip(loc(r, 'description', locale))}</span> },
    ],
  },

  branches: {
    service: 'branches',
    icon: 'store',
    title: ['الفروع', 'Branches'],
    subtitle: ['فروع الاستلام: العنوان والموقع وتفعيل الاستلام من الفرع', 'Pickup branches: address, location and branch pickup'],
    searchText: (r) => `${r.name_ar} ${r.name_en} ${r.address} ${r.city_name}`,
    toggle: true,
    filter: { name: 'is_active', label: ['الحالة', 'Status'], options: [['1', 'فعّال|Active'], ['0', 'متوقف|Stopped']] },
    fields: [
      { name: 'name', label: ['اسم الفرع', 'Branch name'], type: 'bilingual', required: true },
      { name: 'city_id', label: ['المدينة', 'City'], type: 'select', optionsFrom: 'cities', required: true },
      { name: 'address', label: ['العنوان', 'Address'], type: 'text', required: true },      { name: 'latitude', label: ['خط العرض', 'Latitude'], type: 'number', step: 'any' },
      { name: 'longitude', label: ['خط الطول', 'Longitude'], type: 'number', step: 'any' },
      { name: 'pickup_enabled', label: ['الاستلام من الفرع مفعّل', 'Pickup enabled'], type: 'switch' },
      { name: 'is_active', label: ['فعّال', 'Active'], type: 'switch' },
    ],
    columns: [
      { key: 'name', header: ['الفرع', 'Branch'], sortValue: (r) => r.name_ar, cell: (r, { locale }) => <b>{loc(r, 'name', locale)}</b> },
      { key: 'city', header: ['المدينة', 'City'], sortValue: (r) => r.city_name, cell: (r) => r.city_name || r.city_id },
      { key: 'address', header: ['العنوان', 'Address'], hideOnMobile: true, cell: (r) => <span className="text-slate-500 text-xs">{r.address}</span> },
      { key: 'pickup', header: ['الاستلام', 'Pickup'], align: 'center', cell: (r, { tr }) => yesNo(r.pickup_enabled, tr) },
    ],
    rowActions: [{ name: 'pickup', label: ['تفعيل / إيقاف الاستلام من الفرع', 'Toggle branch pickup'], icon: 'package-check' }],
  },

  cities: {
    service: 'cities',
    icon: 'map-pin',
    title: ['المدن', 'Cities'],
    subtitle: ['المدن المتاحة للتوصيل والفروع', 'Cities available for delivery and branches'],
    searchText: (r) => `${r.name_ar} ${r.name_en}`,
    toggle: true,
    filter: { name: 'is_active', label: ['الحالة', 'Status'], options: [['1', 'فعّال|Active'], ['0', 'متوقف|Stopped']] },
    fields: [
      { name: 'name', label: ['اسم المدينة', 'City name'], type: 'bilingual', required: true },
      { name: 'country_id', label: ['رقم الدولة', 'Country id'], type: 'number', required: true },
      { name: 'is_active', label: ['فعّالة', 'Active'], type: 'switch' },
    ],
    columns: [
      { key: 'name', header: ['المدينة', 'City'], sortValue: (r) => r.name_ar, cell: (r, { locale }) => <b>{loc(r, 'name', locale)}</b> },
      { key: 'private', header: ['توصيل خاص', 'Private delivery'], align: 'center', cell: (r, { tr }) => yesNo(r.private_delivery, tr) },
    ],
    rowActions: [{ name: 'privateDelivery', label: ['تفعيل / إيقاف التوصيل الخاص', 'Toggle private delivery'], icon: 'truck' }],
  },

  clients: {
    service: 'clients',
    icon: 'users',
    title: ['العملاء', 'Clients'],
    subtitle: ['حسابات عملاء المتجر: بحث وحظر وحذف', 'Store customer accounts: search, ban and delete'],
    searchText: (r) => `${r.name} ${r.email} ${r.phone}`,
    readOnly: true,
    canDelete: true,
    fields: [],
    columns: [
      { key: 'name', header: ['العميل', 'Client'], sortValue: (r) => r.name, cell: (r) => <b>{r.name || '—'}</b> },
      { key: 'email', header: ['البريد', 'Email'], hideOnMobile: true, cell: (r) => <span dir="ltr">{r.email}</span> },
      { key: 'phone', header: ['الجوال', 'Mobile'], cell: (r) => <span dir="ltr">{r.phone}</span> },
      { key: 'banned', header: ['الحالة', 'Status'], align: 'center', cell: (r, { tr }) => <Badge tone={r.is_banned ? 'rose' : 'green'}>{r.is_banned ? tr('محظور', 'Banned') : tr('نشط', 'Active')}</Badge> },
    ],
    rowActions: [{ name: 'ban', label: ['حظر / إلغاء الحظر', 'Ban / unban'], icon: 'ban', tone: 'danger' }],
  },

  reviews: {
    service: 'reviews',
    icon: 'star',
    title: ['التقييمات', 'Reviews'],
    subtitle: ['تقييمات العملاء للطلبات: إخفاء أو حذف', 'Customer order reviews: hide or delete'],
    searchText: (r) => `${r.comment} ${r.client_name} ${r.order_number}`,
    readOnly: true,
    canDelete: true,
    fields: [],
    columns: [
      { key: 'client', header: ['العميل', 'Client'], sortValue: (r) => r.client_name, cell: (r) => <b>{r.client_name || '—'}</b> },
      { key: 'rate', header: ['التقييم', 'Rating'], sortValue: (r) => Number(r.rate), cell: (r) => <span className="text-amber-600">{'★'.repeat(Math.max(0, Math.min(5, Number(r.rate) || 0)))}</span> },
      { key: 'comment', header: ['التعليق', 'Comment'], hideOnMobile: true, cell: (r) => <span className="text-slate-600 text-xs">{clip(r.comment, 120)}</span> },
      { key: 'order', header: ['الطلب', 'Order'], hideOnMobile: true, cell: (r) => <span className="font-mono text-xs">#{r.order_number}</span> },
      { key: 'hidden', header: ['الحالة', 'Status'], align: 'center', cell: (r, { tr }) => <Badge tone={r.is_hidden ? 'stone' : 'green'}>{r.is_hidden ? tr('مخفي', 'Hidden') : tr('ظاهر', 'Visible')}</Badge> },
    ],
    rowActions: [{ name: 'hide', label: ['إخفاء / إظهار', 'Hide / show'], icon: 'eye-off' }],
  },

  notifications: {
    service: 'notifications',
    icon: 'bell',
    title: ['إرسال الإشعارات', 'Send notifications'],
    subtitle: ['إشعارات تُرسل إلى عملاء المتجر (عنوان ونص بالعربية والإنجليزية)', 'Notifications sent to store customers (title and text in Arabic and English)'],
    searchText: (r) => `${r.title_ar} ${r.title_en} ${r.body_ar}`,
    noEdit: true,
    fields: [
      { name: 'title', label: ['عنوان الإشعار', 'Notification title'], type: 'bilingual', required: true },
      { name: 'body', label: ['نص الإشعار', 'Notification text'], type: 'bilingual-area', required: true },
      { name: 'type', label: ['المستلمون', 'Recipients'], type: 'select', options: [['client', 'العملاء|Clients']], required: true },
    ],
    columns: [
      { key: 'title', header: ['العنوان', 'Title'], sortValue: (r) => r.title_ar, cell: (r, { locale }) => <b>{loc(r, 'title', locale)}</b> },
      { key: 'body', header: ['النص', 'Text'], hideOnMobile: true, cell: (r, { locale }) => <span className="text-slate-600 text-xs">{clip(loc(r, 'body', locale), 120)}</span> },
      { key: 'type', header: ['المستلمون', 'Recipients'], cell: (r) => <Badge tone="gold">{r.type}</Badge> },
      { key: 'date', header: ['التاريخ', 'Date'], hideOnMobile: true, sortValue: (r) => r.created_at, cell: (r) => <span className="text-xs text-slate-500">{r.created_at}</span> },
    ],
  },

  roles: {
    service: 'roles',
    icon: 'shield-check',
    title: ['الأدوار والصلاحيات', 'Roles & permissions'],
    subtitle: ['أدوار فريق الإدارة والصلاحيات التي يملكها كل دور', 'Admin team roles and the permissions each role holds'],
    searchText: (r) => `${r.name_ar} ${r.name_en}`,
    fields: [
      { name: 'name', label: ['اسم الدور', 'Role name'], type: 'bilingual', required: true },
      { name: 'permission_ids', label: ['الصلاحيات', 'Permissions'], type: 'permissions' },
    ],
    columns: [
      { key: 'name', header: ['الدور', 'Role'], sortValue: (r) => r.name_ar, cell: (r, { locale }) => <b>{loc(r, 'name', locale)}</b> },
      { key: 'permissions', header: ['عدد الصلاحيات', 'Permissions'], align: 'center', cell: (r, { tr }) => (r.permissions_known ? <Badge tone="gold">{r.permission_ids.length}</Badge> : <span className="text-slate-300">—</span>) },
    ],
  },

  contacts: {
    service: 'contacts',
    icon: 'mail',
    title: ['رسائل التواصل', 'Contact messages'],
    subtitle: ['الرسائل الواردة من نموذج اتصل بنا', 'Messages from the contact form'],
    searchText: (r) => `${r.full_name} ${r.email} ${r.content}`,
    readOnly: true,
    canDelete: true,
    fields: [],
    columns: [
      { key: 'name', header: ['الاسم', 'Name'], sortValue: (r) => r.full_name, cell: (r) => <b>{r.full_name}</b> },
      { key: 'email', header: ['البريد', 'Email'], hideOnMobile: true, cell: (r) => <span dir="ltr">{r.email}</span> },
      { key: 'content', header: ['الرسالة', 'Message'], cell: (r) => <span className="text-slate-600 text-xs">{clip(r.content, 140)}</span> },
    ],
  },
};
