import { assetUrl } from '@tamrna/shared/utils';

/**
 * Pure helpers that turn the `settings` map + menu rows into everything layouts/app.php computed inline
 * (site name, contact details, social links, payment marks, localized navigation).
 */

const pickLabel = (m, isEn) => {
  const order = isEn ? ['label_en', 'title_en', 'label_ar', 'title_ar'] : ['label_ar', 'title_ar', 'label_en', 'title_en'];
  for (const col of order) if (String(m[col] ?? '').trim()) return String(m[col]).trim();
  return '';
};

/** @param {Array<object>} rows menu rows with a resolved `href` */
export function buildMenu(rows = [], locale = 'ar') {
  return rows
    .map((m) => ({ href: m.href, label: pickLabel(m, locale === 'en'), newTab: !!m.open_new_tab }))
    .filter((m) => m.href && m.label);
}

export function defaultNav(locale) {
  const en = locale === 'en';
  return [
    { href: '/', label: en ? 'Home' : 'الرئيسية', newTab: false },
    { href: '/catalog', label: en ? 'Categories' : 'الأقسام', newTab: false },
    { href: '/catalog?filter=preorder', label: en ? 'Pre-orders' : 'الحجز المسبق', newTab: false },
    { href: '/gift-cards', label: en ? 'Gift Cards' : 'بطاقات الإهداء', newTab: false },
    { href: '/about', label: en ? 'Our Story' : 'من نحن', newTab: false },
    { href: '/contact', label: en ? 'Contact' : 'تواصل معنا', newTab: false },
  ];
}

/**
 * @param {Record<string,string>} settings
 * @param {{ header?: object[], footer?: object[] }} menus
 * @param {'ar'|'en'} locale
 */
export function deriveShell(settings = {}, menus = {}, locale = 'ar') {
  const isEn = locale === 'en';
  const setting = (keys, dflt = '') => {
    for (const k of keys) if (settings[k] != null && String(settings[k]).trim() !== '') return String(settings[k]).trim();
    return dflt;
  };
  const siteName = settings[`site_name_${locale}`] ?? (isEn ? 'Tumurna Luxury Dates' : 'تَـمْرُنـا للتمور الفاخرة');
  const siteTagline = settings[`site_tagline_${locale}`] ?? (isEn ? 'Finest Saudi Dates & Royal Hospitality' : 'أفخر أنواع التمور الملكية والضيافة السعودية');
  const announcement =
    settings[`announcement_text_${locale}`] ??
    (isEn ? 'Free fast refrigerated shipping across KSA on orders over 300 SAR 🌴' : 'شحن مبرد فاخر وسريع مجاناً للطلبات فوق ٣٠٠ ر.س داخل كافة مدن المملكة 🌴');
  const contactPhone = settings.contact_phone ?? '8001248888';
  const contactEmail = settings.contact_email ?? 'care@tumurna.com';
  const whatsapp = settings.contact_whatsapp ?? settings.whatsapp_number ?? '966500000000';
  const logo = setting(['site_logo']);

  const socialLinks = [
    ['Instagram', 'instagram', setting(['social_instagram', 'instagram_url'])],
    ['Snapchat', 'ghost', setting(['social_snapchat', 'snapchat_url'])],
    ['TikTok', 'music', setting(['social_tiktok', 'tiktok_url'])],
    ['X', 'send', setting(['social_facebook', 'social_x', 'x_url'])],
  ]
    .filter((s) => s[2] !== '')
    .map(([name, icon, url]) => ({ name, icon, url }));

  const nav = buildMenu(menus.header, locale);
  const footerMenu = buildMenu(menus.footer, locale);

  return {
    siteName,
    siteTagline,
    announcement,
    contactPhone,
    phoneDigits: String(contactPhone).replace(/[^\d+]/g, ''),
    contactEmail,
    whatsappDigits: String(whatsapp).replace(/\D+/g, ''),
    footerText:
      settings[`footer_text_${locale}`] ??
      (isEn ? 'All rights reserved for Tumurna Luxury Dates © 2026' : 'جميع الحقوق محفوظة لمتجر تَـمْرُنـا للتمور الفاخرة © 2026'),
    socialLinks,
    taxNumber: setting(['tax_number', 'vat_number']),
    crNumber: setting(['cr_number', 'commercial_register']),
    contactAddress: setting([`contact_address_${locale}`, 'contact_address'], isEn ? 'Kingdom of Saudi Arabia' : 'المملكة العربية السعودية'),
    payOn: (key) => String(settings[key] ?? '1') === '1',
    customLogo: logo && logo.replace(/^\//, '') !== 'assets/images/logo.png' ? assetUrl(logo, '/') : '',
    nav: nav.length ? nav : defaultNav(locale),
    footerMenu,
  };
}

/** Is a menu link the current page? Query strings (e.g. ?filter=preorder) must match too (menuActive()). */
export function isMenuActive(href, pathname, searchParams) {
  if (/^(https?:)?\/\//.test(href)) return false;
  const url = new URL(href, 'http://x');
  const path = url.pathname || '/';
  const wanted = [...url.searchParams.entries()];
  if (path === '/') return pathname === '/';
  if (!(pathname === path || pathname.startsWith(`${path}/`))) return false;
  if (wanted.length) return wanted.every(([k, v]) => (searchParams.get(k) ?? '') === v);
  return !searchParams.get('filter');
}
