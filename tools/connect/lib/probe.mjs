import { pathToFileURL } from 'node:url';
import { APPS, abs, readJson } from './contract.mjs';

/**
 * Live checks against the real backend. Everything is read-only except the login call.
 * Each result: { group, name, status: 'pass' | 'warn' | 'fail', detail, fix? }.
 */

async function endpointResolver() {
  const { applyOverrides } = await import(pathToFileURL(abs('shared/api/endpointOverrides.js')).href);
  const maps = {};
  for (const id of Object.keys(APPS)) {
    const base = (await import(pathToFileURL(abs(APPS[id].base)).href)).default;
    maps[id] = applyOverrides(base, readJson(APPS[id].overrides, {}));
  }
  const pick = (id, key, args = []) => {
    const v = key.split('.').reduce((o, k) => o?.[k], maps[id]);
    return typeof v === 'function' ? v(...args) : v;
  };
  return pick;
}

const unwrap = (b) => (b && typeof b === 'object' && !Array.isArray(b) && 'data' in b ? b.data : b);

class Jar {
  cookies = new Map();
  absorb(res) {
    for (const line of res.headers.getSetCookie?.() || []) {
      const [pair] = line.split(';');
      const i = pair.indexOf('=');
      this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  xsrf() {
    const v = this.cookies.get('XSRF-TOKEN');
    return v ? decodeURIComponent(v) : null;
  }
}

export async function runProbe({ apiUrl, auth, origins, creds, onResult }) {
  const results = [];
  const push = (r) => {
    results.push(r);
    onResult?.(r);
  };
  const pick = await endpointResolver();
  const jar = new Jar();
  let token = null;
  const url = (p) => `${apiUrl.replace(/\/$/, '')}/${String(p).replace(/^\//, '')}`;

  async function call(method, path, { body, query, authed = false, origin } = {}) {
    const headers = { Accept: 'application/json', 'Accept-Language': 'ar', 'X-Requested-With': 'XMLHttpRequest' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (origin) headers.Origin = origin;
    if (authed && auth === 'token' && token) headers.Authorization = `Bearer ${token}`;
    if (auth === 'cookie') {
      if (jar.header()) headers.Cookie = jar.header();
      if (jar.xsrf() && method !== 'GET') headers['X-XSRF-TOKEN'] = jar.xsrf();
    }
    const q = query ? `?${new URLSearchParams(query)}` : '';
    const started = Date.now();
    const res = await fetch(url(path) + q, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    jar.absorb(res);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { res, json, text, ms: Date.now() - started };
  }

  const describeHttp = (r) => `HTTP ${r.res.status} · ${r.ms}ms`;

  // 1. reachability + JSON discipline -------------------------------------------------------------------------------------
  let pub;
  try {
    pub = await call('GET', pick('web', 'settings'));
  } catch (e) {
    push({ group: 'الاتصال', name: 'الوصول للـ API', status: 'fail', detail: `${apiUrl} — ${e.cause?.code || e.message}`, fix: 'تأكد أن السيرفر شغال وأن API_URL صحيح (بما فيه /api إن وُجد).' });
    return results;
  }
  if (pub.res.status >= 300 && pub.res.status < 400) {
    push({ group: 'الاتصال', name: 'الوصول للـ API', status: 'fail', detail: `${describeHttp(pub)} → redirect إلى ${pub.res.headers.get('location')}`, fix: 'الـ API لا يجب أن يعمل redirect؛ تأكد من الـ URL ومن HTTPS.' });
  } else if (!pub.json) {
    push({ group: 'الاتصال', name: 'الرد JSON', status: 'fail', detail: `${describeHttp(pub)} — الرد ليس JSON (غالبًا HTML)`, fix: 'تأكد من مسار settings، ومن أن الـ route داخل مجموعة api وأن Accept: application/json مدعوم.' });
  } else if (pub.res.status === 404) {
    push({ group: 'الاتصال', name: 'مسار /settings', status: 'fail', detail: `${describeHttp(pub)} — ${pub.json.message || ''}`, fix: 'المسار غير موجود: شغّل المعالج بملف الـ API لمطابقة المسارات.' });
  } else {
    push({ group: 'الاتصال', name: 'الوصول للـ API', status: pub.res.ok ? 'pass' : 'warn', detail: describeHttp(pub) });
    const hasEnvelope = pub.json && typeof pub.json === 'object' && 'data' in pub.json;
    push({ group: 'الاتصال', name: 'شكل الرد { success, data }', status: hasEnvelope ? 'pass' : 'warn', detail: hasEnvelope ? 'يوجد data' : 'الرد بدون data — الواجهة تقبله لكن الأفضل توحيد الشكل' });
  }

  // 2. CORS ---------------------------------------------------------------------------------------------------------------
  for (const [name, origin] of Object.entries(origins)) {
    try {
      const r = await call('OPTIONS', pick('dashboard', 'login'), { origin });
      const allow = r.res.headers.get('access-control-allow-origin');
      const headers = (r.res.headers.get('access-control-allow-headers') || '').toLowerCase();
      const allowCreds = r.res.headers.get('access-control-allow-credentials');
      const originOk = allow === origin || (allow === '*' && auth === 'token');
      const need = ['authorization', 'content-type', 'x-requested-with', 'accept-language'];
      const missing = auth === 'token' ? need.filter((h) => !headers.includes(h) && headers !== '*') : [];
      const credsOk = auth !== 'cookie' || allowCreds === 'true';
      const status = originOk && !missing.length && credsOk ? 'pass' : 'fail';
      const reasons = [];
      if (!originOk) reasons.push(`Access-Control-Allow-Origin=${allow || 'غير موجود'}`);
      if (missing.length) reasons.push(`headers ناقصة: ${missing.join(', ')}`);
      if (!credsOk) reasons.push('Allow-Credentials ليست true');
      push({ group: 'CORS', name: `Preflight من ${name} (${origin})`, status, detail: status === 'pass' ? describeHttp(r) : reasons.join(' · '), fix: 'في config/cors.php: أضف الـ origin إلى allowed_origins و allowed_headers => [*] و supports_credentials => true عند استخدام cookie.' });
    } catch (e) {
      push({ group: 'CORS', name: `Preflight من ${name}`, status: 'fail', detail: e.message });
    }
  }

  // 3. Sanctum cookie ----------------------------------------------------------------------------------------------------
  if (auth === 'cookie') {
    try {
      const origin = apiUrl.replace(/\/api\/?.*$/, '').replace(/\/$/, '');
      const res = await fetch(`${origin}/sanctum/csrf-cookie`, { headers: { Accept: 'application/json' } });
      jar.absorb(res);
      push({ group: 'Sanctum', name: 'GET /sanctum/csrf-cookie', status: jar.xsrf() ? 'pass' : 'fail', detail: jar.xsrf() ? `HTTP ${res.status} + XSRF-TOKEN` : `HTTP ${res.status} بدون كوكي XSRF-TOKEN`, fix: 'فعّل Sanctum SPA: SANCTUM_STATEFUL_DOMAINS و SESSION_DOMAIN في .env.' });
    } catch (e) {
      push({ group: 'Sanctum', name: 'GET /sanctum/csrf-cookie', status: 'fail', detail: e.message });
    }
  }

  // 4. public endpoints + shapes -------------------------------------------------------------------------------------------
  const publicChecks = [
    { key: 'shell', keys: ['settings', 'menus'], label: 'Shell (الإعدادات + القوائم)' },
    { key: 'home', keys: ['banners', 'categories', 'products'], label: 'الصفحة الرئيسية' },
    { key: 'catalog', keys: [], label: 'الكتالوج' },
  ];
  for (const c of publicChecks) {
    try {
      const r = await call('GET', pick('web', c.key));
      const d = unwrap(r.json);
      if (!r.res.ok || !d || typeof d !== 'object') {
        push({ group: 'المتجر', name: c.label, status: 'fail', detail: `${describeHttp(r)} ${r.json?.message || ''}`, fix: 'المسار أو الرد غير صحيح.' });
        continue;
      }
      const missing = c.keys.filter((k) => !(k in d));
      push({ group: 'المتجر', name: c.label, status: missing.length ? 'warn' : 'pass', detail: missing.length ? `حقول ناقصة: ${missing.join(', ')} (موجود: ${Object.keys(d).slice(0, 8).join(', ')})` : describeHttp(r), fix: missing.length ? 'عدّل الـ adapter في web/services/adapters/laravel ليحوّل أسماء الحقول، أو اطلب من الباك اند تسميتها هكذا.' : undefined });
    } catch (e) {
      push({ group: 'المتجر', name: c.label, status: 'fail', detail: e.message });
    }
  }

  // 5. dashboard login + authenticated reads ---------------------------------------------------------------------------------
  if (!creds?.email) {
    push({ group: 'اللوحة', name: 'تسجيل الدخول والقراءات المحمية', status: 'warn', detail: 'تم التخطي (لم تُدخل حساب مدير).' });
    return results;
  }
  let loginRes;
  try {
    loginRes = await call('POST', pick('dashboard', 'login'), { body: { identity: creds.email, password: creds.password } });
  } catch (e) {
    push({ group: 'اللوحة', name: 'تسجيل الدخول', status: 'fail', detail: e.message });
    return results;
  }
  const ld = unwrap(loginRes.json) || {};
  token = ld.token || ld.access_token || ld.plainTextToken || null;
  const user = ld.user || null;
  if (!loginRes.res.ok) {
    push({ group: 'اللوحة', name: 'تسجيل الدخول', status: 'fail', detail: `${describeHttp(loginRes)} — ${loginRes.json?.message || 'فشل'}`, fix: loginRes.res.status === 422 ? 'الـ API يتوقع أسماء حقول مختلفة (مثلاً email بدل identity): عدّل dashboard/src/services/adapters/laravel/auth.js.' : 'تحقق من البيانات أو من مسار login.' });
    return results;
  }
  push({ group: 'اللوحة', name: 'تسجيل الدخول', status: auth === 'token' && !token ? 'fail' : 'pass', detail: auth === 'token' ? (token ? 'استلم token' : 'لم يرجع token (توقعنا data.token)') : 'نجح (session cookie)', fix: 'ارجع { data: { token, user } } من /login.' });
  push({ group: 'اللوحة', name: 'بيانات المستخدم (user.role_name)', status: user?.role_name ? 'pass' : 'warn', detail: user?.role_name ? `role_name = ${user.role_name}` : `الحقل غير موجود في user (${Object.keys(user || {}).join(', ') || 'لا user'}). الواجهة تحتاجه للصلاحيات.`, fix: 'أضف role_name (customer | store_manager | super_admin) أو حوّله داخل adapters/laravel/auth.js.' });

  const stats = ['totalSales', 'totalOrders', 'totalProducts', 'totalCustomers', 'lowStockVariants', 'recentOrders', 'categoriesCount'];
  const authed = [
    { key: 'me', label: 'المستخدم الحالي', keys: ['id'] },
    { key: 'dashboard', label: 'إحصائيات الداشبورد', keys: stats },
    { key: 'products.list', label: 'قائمة المنتجات', list: true },
    { key: 'categories.list', label: 'قائمة الأقسام', list: true },
    { key: 'orders.list', label: 'قائمة الطلبات', list: true },
    { key: 'coupons.list', label: 'قائمة الكوبونات', list: true },
    { key: 'users.list', label: 'قائمة المستخدمين', list: true },
  ];
  for (const c of authed) {
    try {
      const r = await call('GET', pick('dashboard', c.key), { authed: true });
      const d = unwrap(r.json);
      if (r.res.status === 401 || r.res.status === 403) {
        push({ group: 'اللوحة', name: c.label, status: 'fail', detail: `${describeHttp(r)} — الصلاحية أو الـ token`, fix: auth === 'token' ? 'تأكد من Authorization: Bearer ومن middleware auth:sanctum.' : 'تأكد من كوكي الجلسة ومن stateful domains.' });
      } else if (!r.res.ok) {
        push({ group: 'اللوحة', name: c.label, status: 'fail', detail: `${describeHttp(r)} ${r.json?.message || ''}`, fix: 'المسار غير مطابق أو خطأ في السيرفر.' });
      } else if (c.list) {
        const isArr = Array.isArray(d);
        const paginated = d && typeof d === 'object' && Array.isArray(d.data);
        push({ group: 'اللوحة', name: c.label, status: isArr ? 'pass' : 'warn', detail: isArr ? `${d.length} عنصر · ${r.ms}ms` : paginated ? 'الرد paginated (data.data) والواجهة تتوقع array مباشرة' : 'الرد ليس array', fix: 'اجعل الـ response { success, data: [ ... ] } أو عدّل helper القراءة في adapters/laravel.' });
      } else {
        const missing = (c.keys || []).filter((k) => !(d && k in d));
        push({ group: 'اللوحة', name: c.label, status: missing.length ? 'warn' : 'pass', detail: missing.length ? `حقول ناقصة: ${missing.join(', ')} (موجود: ${Object.keys(d || {}).slice(0, 8).join(', ')})` : describeHttp(r), fix: missing.length ? 'غالبًا الاختلاف camelCase/snake_case: حوّلها داخل adapters/laravel/store.js.' : undefined });
      }
    } catch (e) {
      push({ group: 'اللوحة', name: c.label, status: 'fail', detail: e.message });
    }
  }
  return results;
}
