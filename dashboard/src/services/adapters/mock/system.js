import { dictionaries } from '@tamrna/shared/i18n';
import { nowSql } from '@tamrna/shared/utils';
import { db, latency, fail, requireRole, logActivity } from './db';

/**
 * Mock adapter for the system screens: translations editor, cache, logs, security suite and backups
 * (TranslationsController, CacheController, LogsController, SecurityController, BackupController).
 */

// ------------------------------------------------------------------------------------------ translations
const PREFIX_CATEGORIES = [
  ['storefront', ['hero_', 'site_', 'badge_', 'feature_', 'footer_', 'tamrna_', 'why_tumurna_', 'story_', 'announcement_']],
  ['catalog', ['product_', 'category_', 'preorder_', 'gift_', 'dates_', 'harvest_', 'size_', 'variant_']],
  ['checkout', ['cart_', 'checkout_', 'pay_', 'payment_', 'mada_', 'tamara_', 'tabby_', 'coupon_', 'shipping_', 'saudi_', 'city_', 'cold_', 'free_cold_', 'allow_guest_', 'guest_checkout_']],
  ['profile_otp', ['profile_', 'otp_', 'demo_otp', 'my_', 'address_', 'addresses_', 'customer_']],
  ['acf', ['acf_', 'repeater_', 'sub_field']],
  ['orders', ['order_', 'step_', 'tracking_']],
  ['admin', ['admin_', 'role_', 'status_', 'menu_', 'menus_', 'home_section', 'layout_', 'user_', 'warehouse_', 'warehouses_', 'categories_', 'users_']],
  ['security_cache', ['cache_', 'logs_', 'security_', 'backup_', 'auto_backup_', 'restore', 'confirm_restore_']],
];

/** Same buckets as TranslationsController::categorizeKey() (prefix rules). */
export function categorizeKey(key) {
  const hit = PREFIX_CATEGORIES.find(([, prefixes]) => prefixes.some((p) => key.startsWith(p)));
  return hit ? hit[0] : 'general';
}

export async function listTranslations() {
  await latency(250);
  requireRole('super_admin');
  const overrides = Object.fromEntries(db.all('translations').map((t) => [t.key, t]));
  const keys = [...new Set([...Object.keys(dictionaries.ar), ...Object.keys(dictionaries.en), ...Object.keys(overrides)])].sort();
  const rows = keys.map((key) => {
    const o = overrides[key];
    const ar = o?.ar ?? dictionaries.ar[key] ?? '';
    const en = o?.en ?? dictionaries.en[key] ?? '';
    return { key, ar, en, category: categorizeKey(key), overridden: !!o, custom: !(key in dictionaries.ar) && !(key in dictionaries.en), missing: ar === '' || en === '' };
  });
  return rows;
}

export async function saveTranslation({ key, ar, en }) {
  await latency(200);
  requireRole('super_admin');
  const k = String(key || '').trim();
  if (!/^[a-z0-9_.-]+$/i.test(k)) fail('مفتاح الترجمة غير صالح (حروف إنجليزية وأرقام و _ فقط)', 422, { key: ['مفتاح الترجمة غير صالح'] });
  const existing = db.all('translations').find((t) => t.key === k);
  if (existing) db.update('translations', existing.id, { ar, en });
  else db.insert('translations', { key: k, ar, en });
  logActivity('info', 'admin', `Translation saved: ${k}`);
  return { key: k };
}

export async function deleteTranslation(key) {
  await latency(150);
  requireRole('super_admin');
  db.removeWhere('translations', (t) => t.key === key);
  return { success: true };
}

// --------------------------------------------------------------------------------------------------- cache
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);
const CACHE_GROUPS = ['data', 'translations', 'settings', 'views', 'queries', 'security'];

function cacheStats() {
  const rows = db.all('cache_entries');
  const groups = Object.fromEntries(
    CACHE_GROUPS.map((g) => {
      const r = rows.find((x) => x.group === g) || { files: 0, size_bytes: 0 };
      return [g, { count: r.files, size: r.size_bytes, size_formatted: fmtSize(r.size_bytes) }];
    }),
  );
  const total_size = Object.values(groups).reduce((s, g) => s + g.size, 0);
  return { total_size, total_size_formatted: fmtSize(total_size), total_files: Object.values(groups).reduce((s, g) => s + g.count, 0), groups };
}

export async function getCacheStats() {
  await latency(150);
  requireRole('super_admin');
  return cacheStats();
}

export async function clearCache(group = 'all') {
  await latency(250);
  requireRole('super_admin');
  // cache_entries rows are keyed by group (no id), so the whole table is rewritten
  const next = CACHE_GROUPS.map((g) => {
    const r = db.all('cache_entries').find((x) => x.group === g) || { files: 0, size_bytes: 0 };
    return group === 'all' || group === g ? { group: g, files: 0, size_bytes: 0 } : { group: g, files: r.files, size_bytes: r.size_bytes };
  });
  db.replace('cache_entries', next);
  logActivity('info', 'system', `Cache flushed for group [${group}]`);
  return { message: 'تم تفريغ الذاكرة المؤقتة بنجاح', group, stats: cacheStats() };
}

export async function preloadCache() {
  await latency(900);
  requireRole('super_admin');
  const warmed = [
    { item: 'settings', ok: true, size_bytes: 3412 },
    { item: 'translations (ar)', ok: true, size_bytes: 96210 },
    { item: 'translations (en)', ok: true, size_bytes: 91844 },
    { item: 'home sections', ok: true, size_bytes: 8120 },
    { item: 'categories & featured products', ok: true, size_bytes: 15480 },
  ];
  db.replace('cache_entries', [
    { group: 'data', files: 6, size_bytes: 23600 },
    { group: 'translations', files: 2, size_bytes: 188054 },
    { group: 'settings', files: 1, size_bytes: 3412 },
    { group: 'views', files: 0, size_bytes: 0 },
    { group: 'queries', files: 0, size_bytes: 0 },
    { group: 'security', files: 1, size_bytes: 512 },
  ]);
  logActivity('info', 'system', 'Cache preloaded & warmed', { items: warmed.length });
  return { message: 'تم إحماء وتوليد الكاش بنجاح', warmed, stats: cacheStats() };
}

// ---------------------------------------------------------------------------------------------------- logs
const logRows = () => db.all('security_logs').slice().sort((a, b) => b.id - a.id);

export async function listLogs({ level = 'all', channel = 'all', q = '', limit = 150 } = {}) {
  await latency(200);
  requireRole('super_admin');
  const all = logRows();
  const needle = String(q).toLowerCase().trim();
  const rows = all
    .filter((l) => (level === 'all' || l.level === level) && (channel === 'all' || l.channel === channel) && (!needle || `${l.message} ${JSON.stringify(l.context || {})}`.toLowerCase().includes(needle)))
    .slice(0, Math.min(Math.max(1, Number(limit) || 150), 1000));
  const bytes = all.reduce((s, l) => s + JSON.stringify(l).length, 0);
  return {
    logs: rows,
    stats: {
      total_size_formatted: fmtSize(bytes),
      total_events: all.length,
      errors_count: all.filter((l) => l.level === 'error').length,
      warnings_count: all.filter((l) => l.level === 'warning').length,
      security_count: all.filter((l) => l.channel === 'security').length,
      info_count: all.filter((l) => l.level === 'info').length,
    },
    channels: [...new Set(all.map((l) => l.channel))],
  };
}

export async function clearLogs() {
  await latency(200);
  requireRole('super_admin');
  db.replace('security_logs', []);
  return { message: 'تم تفريغ كافة سجلات النظام بنجاح' };
}

export async function downloadLogs() {
  await latency(150);
  requireRole('super_admin');
  const text = logRows().map((l) => `[${l.created_at}] ${l.channel}.${String(l.level).toUpperCase()}: ${l.message} ${JSON.stringify(l.context || {})}`).join('\n');
  return { filename: `alaz_logs_${nowSql().replace(/[: ]/g, '-')}.log`, blob: new Blob([text], { type: 'text/plain;charset=utf-8' }) };
}

// ------------------------------------------------------------------------------------------------ security
const SEC_DEFAULTS = { security_rate_limit_max: '6', security_rate_limit_decay: '300', security_force_https: '0', security_block_tor: '0' };

function audit() {
  const s = { ...SEC_DEFAULTS, ...db.getSettings() };
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const checks = [
    { id: 'https', title: 'شهادة الأمان المشفرة (SSL / HTTPS)', title_en: 'SSL / HTTPS Encryption', status: isHttps ? 'pass' : 'warning', desc: isHttps ? 'الاتصال بالموقع مشفر بالكامل وآمن.' : 'الموقع يعمل حالياً عبر بروتوكول غير مشفر. يُنصح بتفعيل SSL في الإنتاج.', desc_en: isHttps ? 'Connection is fully encrypted and secure.' : 'Site is served over HTTP. SSL is strongly recommended for production.', points: isHttps ? 15 : 0 },
    { id: 'env_protection', title: 'حماية ملفات البيئة والإعدادات الحساسة (.env & .git)', title_en: 'Environment & Config File Protection (.env & .git)', status: 'pass', desc: 'ملف الإعدادات وقواعد البيانات محمية من التنزيل المباشر.', desc_en: 'Environment file and databases are protected against direct access.', points: 20 },
    { id: 'logs_protection', title: 'حظر التصفح الخارجي لمجلد السجلات', title_en: 'Storage & Logs Directory Web Protection', status: 'pass', desc: 'مجلد السجلات محمي بقواعد جدار حماية داخلية.', desc_en: 'Logs directory is shielded by internal rules.', points: 15 },
    { id: 'csrf', title: 'درع الحماية ضد تزوير الطلبات (CSRF)', title_en: 'Cross-Site Request Forgery (CSRF) Shield', status: 'pass', desc: 'حماية CSRF نشطة على كافة نماذج الإرسال.', desc_en: 'CSRF tokens are enforced on all state-changing requests.', points: 20 },
    { id: 'rate_limiting', title: 'مكافحة الهجمات المتكررة وتخمين الـ OTP', title_en: 'Brute-Force & Rate Limiting Defense', status: Number(s.security_rate_limit_max) <= 10 ? 'pass' : 'warning', desc: 'نظام تقييد الطلبات يحمي تسجيل الدخول والتحقق.', desc_en: 'Rate limiter shields sign-in and verification endpoints.', points: Number(s.security_rate_limit_max) <= 10 ? 15 : 5 },
    { id: 'firewall', title: 'جدار حظر العناوين (IP Firewall)', title_en: 'IP Firewall', status: 'pass', desc: 'قائمة الحظر نشطة وتُطبق على كل الطلبات.', desc_en: 'The blocklist is enforced on every request.', points: 15 },
  ];
  const score = Math.min(100, checks.reduce((sum, c) => sum + (c.status === 'pass' ? c.points : c.status === 'warning' ? Math.floor(c.points / 3) : 0), 0));
  return { score, checks };
}

export async function getSecurity() {
  await latency(250);
  requireRole('super_admin');
  return {
    audit: audit(),
    blockedIps: db.all('blocked_ips').slice().sort((a, b) => b.id - a.id),
    recentLogs: logRows().filter((l) => l.channel === 'security').slice(0, 40),
    settings: Object.fromEntries(Object.keys(SEC_DEFAULTS).map((k) => [k, String(db.getSetting(k, SEC_DEFAULTS[k]))])),
  };
}

export async function updateSecuritySettings(values) {
  await latency(250);
  requireRole('super_admin');
  const patch = {};
  Object.keys(SEC_DEFAULTS).forEach((k) => values[k] !== undefined && (patch[k] = String(values[k])));
  db.setSettings(patch);
  logActivity('warning', 'security', 'Security policy settings updated');
  return { success: true };
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

export async function blockIp({ ip, reason }) {
  await latency(250);
  requireRole('super_admin');
  const value = String(ip || '').trim();
  if (!IPV4.test(value) && !(value.includes(':') && IPV6.test(value))) fail('العنوان المدخل غير صالح (Invalid IP)', 400, { ip: ['العنوان المدخل غير صالح (Invalid IP)'] });
  if (['127.0.0.1', '::1'].includes(value)) fail('لا يمكنك حظر عنوان IP الحالي أو عنوان الخادم المحلي منعاً لإغلاق لوحة التحكم.', 400);
  if (db.all('blocked_ips').some((b) => b.ip === value)) fail('هذا العنوان محظور بالفعل', 409);
  db.insert('blocked_ips', { ip: value, reason: String(reason || '').trim() || 'Manual block by Super Admin', blocked_at: nowSql() });
  logActivity('warning', 'security', `IP blocked: ${value}`);
  return { message: `تم حظر العنوان ${value} بنجاح وإضافته لقائمة الحظر.` };
}

export async function unblockIp(ip) {
  await latency(200);
  requireRole('super_admin');
  db.removeWhere('blocked_ips', (b) => b.ip === ip);
  logActivity('info', 'security', `IP unblocked: ${ip}`);
  return { message: `تم رفع الحظر عن العنوان ${ip} بنجاح.` };
}

// ------------------------------------------------------------------------------------------------ backups
const BACKUP_SNAP_PREFIX = 'tamrna.admin.backup.snapshot.';

export async function listBackups() {
  await latency(200);
  requireRole('super_admin');
  const s = db.getSettings();
  return {
    backups: db.all('backups').slice().sort((a, b) => b.id - a.id),
    auto: { enabled: String(s.backup_auto_enabled ?? '0') === '1', interval_hours: Number(s.backup_auto_interval_hours || 24), last_auto_at: s.backup_last_auto_at || null },
  };
}

export async function generateBackup() {
  await latency(900);
  requireRole('super_admin');
  const snapshot = JSON.stringify(db.snapshot());
  const stamp = nowSql().replace(/[-:]/g, '').replace(' ', '_').slice(0, 13);
  const record = db.insert('backups', { filename: `tamrna_backup_${stamp}.json`, size_bytes: snapshot.length, type: 'manual', created_at: nowSql() });
  try {
    localStorage.setItem(`${BACKUP_SNAP_PREFIX}${record.id}`, snapshot);
  } catch {
    /* storage full: the backup record stays but cannot be restored */
  }
  // keep only the 5 most recent backups (Backup::pruneOldBackups)
  db.all('backups').slice().sort((a, b) => b.id - a.id).slice(5).forEach((b) => {
    db.remove('backups', b.id);
    try { localStorage.removeItem(`${BACKUP_SNAP_PREFIX}${b.id}`); } catch { /* ignore */ }
  });
  logActivity('info', 'system', `Backup created: ${record.filename}`);
  return { message: 'تم إنشاء النسخة الاحتياطية الكاملة بنجاح', backup: record };
}

export async function deleteBackup(id) {
  await latency(200);
  requireRole('super_admin');
  db.remove('backups', id);
  try { localStorage.removeItem(`${BACKUP_SNAP_PREFIX}${id}`); } catch { /* ignore */ }
  return { success: true };
}

export async function downloadBackup(id) {
  await latency(200);
  requireRole('super_admin');
  const record = db.find('backups', id);
  if (!record) fail('Backup file not found', 404);
  const snapshot = (typeof localStorage !== 'undefined' && localStorage.getItem(`${BACKUP_SNAP_PREFIX}${id}`)) || JSON.stringify({ note: 'seed backup (no snapshot stored)', filename: record.filename });
  return { filename: record.filename, blob: new Blob([snapshot], { type: 'application/json' }) };
}

/** Restore from a stored backup (`id`) or from an uploaded .zip / .sql / .json file. */
export async function restoreBackup({ id, file } = {}) {
  await latency(1200);
  requireRole('super_admin');
  if (id) {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`${BACKUP_SNAP_PREFIX}${id}`) : null;
    if (!raw) fail('لا تحتوي هذه النسخة على بيانات قابلة للاسترجاع في وضع المحاكاة', 409);
    db.restore(JSON.parse(raw));
    logActivity('warning', 'system', `Backup restored: #${id}`);
    return { restored: true };
  }
  if (!file) fail('اختر ملف النسخة الاحتياطية أولاً', 422);
  if (!/\.(zip|sql|json)$/i.test(file.name)) fail('صيغة الملف غير مدعومة (zip / sql)', 422);
  if (/\.json$/i.test(file.name)) {
    try {
      db.restore(JSON.parse(await file.text()));
    } catch {
      fail('ملف النسخة الاحتياطية تالف', 422);
    }
  }
  logActivity('warning', 'system', `Backup restored from upload: ${file.name}`);
  return { restored: true };
}

export async function saveBackupSchedule({ enabled, interval_hours }) {
  await latency(200);
  requireRole('super_admin');
  db.setSettings({ backup_auto_enabled: enabled ? '1' : '0', backup_auto_interval_hours: String(Math.max(1, Number(interval_hours) || 24)) });
  return { success: true };
}
