#!/usr/bin/env node
/**
 * Tamrna API connection wizard.
 *
 *   npm run connect                       interactive, step by step
 *   npm run connect -- --spec api.json    start from the API file
 *   npm run connect -- --check            only run the live checks against the configured API_URL
 *   npm run connect -- --reset            go back to mock mode and clear path overrides
 *
 * Flags: --apps web,dashboard  --api-url URL  --auth token|cookie  --prefix /api/v1  --email E --password P
 *        --no-probe  --yes (accept confident + likely matches, no questions)
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { APPS, abs, loadContract } from './lib/contract.mjs';
import { parseSpec, detectAuth } from './lib/parse.mjs';
import { detectPrefix, matchContract, manualMatch } from './lib/match.mjs';
import { buildOverrides, envVars, writeEnv, writeOverrides } from './lib/apply.mjs';
import { runProbe } from './lib/probe.mjs';
import { writeReport } from './lib/report.mjs';
import { ask, bad, c, choose, closeUI, confirm, info, isAuto, log, ok, setAuto, step, warn } from './lib/ui.mjs';

const { values: args } = parseArgs({
  options: {
    spec: { type: 'string' },
    apps: { type: 'string' },
    'api-url': { type: 'string' },
    auth: { type: 'string' },
    prefix: { type: 'string' },
    email: { type: 'string' },
    password: { type: 'string' },
    'no-probe': { type: 'boolean' },
    yes: { type: 'boolean' },
    check: { type: 'boolean' },
    reset: { type: 'boolean' },
    help: { type: 'boolean' },
  },
});

const TOTAL = 6;
const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');
const readEnvValue = (appId, name) => {
  try {
    const m = fs.readFileSync(abs(APPS[appId].env), 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
};

function banner() {
  log(c.bold('\n  🌴  معالج ربط API — تمرنا'));
  log(c.dim('  يقرأ ملف الـ API، يطابق المسارات، يكتب الإعدادات، ويفحص السيرفر خطوة بخطوة.\n'));
}

function resetMode() {
  for (const id of Object.keys(APPS)) {
    writeOverrides(id, {});
    writeEnv(id, { [`${APPS[id].envPrefix}API_MODE`]: 'mock' });
    ok(`${APPS[id].label}: رجع إلى وضع mock وتم مسح الـ overrides`);
  }
}

async function askCreds() {
  if (isAuto()) return null;
  log(c.dim('  لفحص اللوحة نحتاج حساب مدير (يُستخدم لطلب تسجيل الدخول فقط ولا يُحفظ).'));
  const email = await ask('بريد/جوال المدير (Enter للتخطي)', '');
  if (!email) return null;
  return { email, password: await ask('كلمة المرور', '') };
}

async function probeAndPrint({ apiUrl, auth, creds }) {
  const urls = {
    web: readEnvValue('web', 'NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000',
    dashboard: readEnvValue('web', 'NEXT_PUBLIC_DASHBOARD_URL') || 'http://localhost:5173',
  };
  let group = '';
  const results = await runProbe({
    apiUrl,
    auth,
    creds,
    origins: { المتجر: urls.web, اللوحة: urls.dashboard },
    onResult: (r) => {
      if (r.group !== group) {
        group = r.group;
        log(`\n  ${c.bold(group)}`);
      }
      const line = `${r.name} ${c.dim(`— ${r.detail}`)}`;
      if (r.status === 'pass') ok(line);
      else if (r.status === 'warn') warn(line);
      else {
        bad(line);
        if (r.fix) info(`   ↳ ${r.fix}`);
      }
    },
  });
  const n = (s) => results.filter((r) => r.status === s).length;
  log(`\n  ${c.green(`${n('pass')} ناجح`)} · ${c.yellow(`${n('warn')} تحذير`)} · ${c.red(`${n('fail')} فشل`)}`);
  return results;
}

async function checkOnly() {
  const apiUrl = args['api-url'] || readEnvValue('dashboard', 'VITE_API_URL') || readEnvValue('web', 'NEXT_PUBLIC_API_URL');
  if (!apiUrl) return bad('لا يوجد API_URL في ملفات .env.local. شغّل المعالج بدون --check أولًا.');
  const auth = args.auth || readEnvValue('dashboard', 'VITE_AUTH_STRATEGY') || 'token';
  const creds = args.email ? { email: args.email, password: args.password || '' } : await askCreds();
  const results = await probeAndPrint({ apiUrl, auth, creds });
  info(`التقرير: ${writeReport({ spec: null, apiUrl, auth, prefix: [], byApp: {}, probe: results })}`);
  return undefined;
}

async function reviewMatches(result, routes) {
  const { matches, missing } = result;
  const high = matches.filter((m) => m.confidence === 'high');
  const medium = matches.filter((m) => m.confidence === 'medium');
  ok(`${high.length} مطابقة مؤكدة`);
  const kept = [...high];

  // "Likely": clearly the best candidate and only a segment name differs (e.g. /storefront/shell -> /public/shell).
  const isLikely = (m) => m.total >= 80 && (m.candidates[1] ? m.total - m.candidates[1].total >= 5 : true);
  const likely = medium.filter(isLikely);
  const uncertain = medium.filter((m) => !isLikely(m));
  if (likely.length) {
    warn(`${likely.length} مطابقة شبه مؤكدة (الاختلاف في اسم مقطع واحد غالبًا):`);
    likely.forEach((m) => log(`    ${m.entry.key.padEnd(24)} ${c.dim(m.entry.template)}  →  ${c.bold(m.route.path)}`));
    if (isAuto() || (await confirm('أقبلها كلها؟', true))) kept.push(...likely);
    else uncertain.push(...likely);
  }

  if (uncertain.length) {
    warn(`${uncertain.length} مطابقة محتاجة مراجعتك${isAuto() ? ' (تم تجاهلها في وضع --yes)' : ''}:`);
    for (const m of uncertain) {
      log(`
    ${c.bold(m.entry.key)}  ${c.dim(`${m.entry.methods.join('/') || '—'} ${m.entry.template}`)}`);
      m.candidates.forEach((cd, i) => log(`      ${i + 1}. ${cd.route.path} ${c.dim(`[${[...cd.route.methods].join('|')}] ${Math.round(cd.total)}%`)}`));
      if (isAuto()) continue;
      const a = await ask('رقم الاختيار / مسار يدوي يبدأ بـ / / s للتخطي', '1');
      if (a.toLowerCase() === 's') continue;
      if (/^\d$/.test(a) && m.candidates[Number(a) - 1]) kept.push({ ...m, ...m.candidates[Number(a) - 1], confidence: 'manual' });
      else if (a.startsWith('/')) kept.push(manualMatch(m.entry, a, routes));
    }
  }

  if (missing.length) {
    warn(`${missing.length} endpoint مطلوبة ولم نجد لها مقابل في ملف الـ API:`);
    missing.slice(0, 12).forEach((m) => log(`    • ${m.entry.key} ${c.dim(`${m.entry.methods.join('/') || '—'} ${m.entry.template}`)}`));
    if (missing.length > 12) info(`   … و ${missing.length - 12} أخرى (كلها في التقرير)`);
    if (!isAuto() && (await confirm('تحب تكتب المسارات الناقصة يدويًا واحدة واحدة؟', false))) {
      for (const m of missing) {
        const a = await ask(`${m.entry.key} (${m.entry.methods.join('/') || '—'}) المسار في الباك اند، Enter للتخطي`, '');
        if (a.startsWith('/')) kept.push(manualMatch(m.entry, a, routes));
      }
    }
  }
  const keptKeys = new Set(kept.map((m) => m.entry.key));
  return { kept, stillMissing: missing.filter((m) => !keptKeys.has(m.entry.key)) };
}

async function main() {
  if (args.help) {
    log(fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
    return;
  }
  setAuto(!!args.yes);
  banner();
  if (args.reset) return resetMode();
  if (args.check) return checkOnly();

  // 1 · apps ---------------------------------------------------------------------------------------------------------------
  step(1, TOTAL, 'اختيار التطبيقات');
  let appIds = args.apps ? args.apps.split(',').map((s) => s.trim()).filter((s) => APPS[s]) : null;
  if (!appIds?.length) {
    appIds = await choose('تربط أنهي تطبيق؟', [
      { label: 'المتجر + لوحة التحكم', value: ['web', 'dashboard'], hint: 'الأغلب' },
      { label: 'المتجر فقط', value: ['web'] },
      { label: 'لوحة التحكم فقط', value: ['dashboard'] },
    ]);
  }
  ok(appIds.map((i) => APPS[i].label).join(' + '));

  // 2 · spec ---------------------------------------------------------------------------------------------------------------
  step(2, TOTAL, 'ملف الـ API');
  info('المدعوم: OpenAPI / Swagger (json أو yaml) · Postman Collection · ناتج `php artisan route:list --json`');
  let specFile = args.spec ? unquote(args.spec) : '';
  if (!specFile) specFile = unquote(await ask('اسحب الملف هنا أو اكتب مساره (Enter للمتابعة بدون ملف)', ''));
  let spec = null;
  if (specFile) {
    try {
      spec = parseSpec(path.resolve(specFile));
      ok(`${spec.kind}: ${spec.ops.length} عملية (method + path)`);
      if (spec.servers[0]) info(`السيرفر في الملف: ${spec.servers[0]}`);
    } catch (e) {
      bad(e.code === 'ENOENT' ? `الملف غير موجود: ${specFile}` : e.message);
      if (!(await confirm('تكمل بدون ملف (ضبط الإعدادات والفحص فقط)؟', true))) return undefined;
    }
  } else warn('بدون ملف: هنضبط الإعدادات ونفحص السيرفر فقط، والمسارات تفضل كما في docs/API_CONTRACT.md.');

  // 3 · matching -----------------------------------------------------------------------------------------------------------
  const byApp = {};
  let prefix = [];
  if (spec) {
    step(3, TOTAL, 'مطابقة المسارات');
    const contracts = {};
    for (const id of appIds) contracts[id] = await loadContract(id);
    prefix = args.prefix ? args.prefix.split('/').filter(Boolean).map((s) => s.toLowerCase()) : detectPrefix(spec.ops, Object.values(contracts));
    if (!args.prefix && !isAuto()) {
      const a = await ask('البادئة المشتركة للمسارات (تُضاف لـ API_URL)', prefix.length ? `/${prefix.join('/')}` : '/');
      prefix = a.split('/').filter(Boolean).map((s) => s.toLowerCase());
    } else info(`البادئة: ${prefix.length ? `/${prefix.join('/')}` : '(لا يوجد)'}`);

    for (const id of appIds) {
      log(`\n  ${c.bold(APPS[id].label)} — ${contracts[id].length} endpoint مطلوب`);
      const result = matchContract(contracts[id], spec.ops, prefix);
      const { kept, stillMissing } = await reviewMatches(result, result.routes);
      const { overrides, issues } = buildOverrides(kept);
      const usedRoutes = new Set(kept.map((m) => m.route.path));
      byApp[id] = { label: APPS[id].label, matches: kept, missing: stillMissing, overrides, issues, extra: result.extra.filter((r) => !usedRoutes.has(r.path)) };
      log(`  ${c.dim(`→ ${kept.length} مربوط · ${Object.keys(overrides).length} مسار يحتاج override · ${stillMissing.length} ناقص`)}`);
    }
  } else step(3, TOTAL, 'مطابقة المسارات (تم التخطي)');

  // 4 · settings -----------------------------------------------------------------------------------------------------------
  step(4, TOTAL, 'إعدادات الاتصال');
  const prefixPath = prefix.length ? `/${prefix.join('/')}` : '';
  let defaultUrl = args['api-url'] || readEnvValue(appIds[0], `${APPS[appIds[0]].envPrefix}API_URL`);
  if (!defaultUrl && spec?.servers[0] && /^https?:/.test(spec.servers[0])) defaultUrl = spec.servers[0].replace(/\/$/, '') + prefixPath;
  if (!defaultUrl) defaultUrl = `http://localhost:8000${prefixPath || '/api'}`;
  const apiUrl = (await ask('عنوان الـ API (API_URL — بدون / في النهاية)', defaultUrl)).replace(/\/$/, '');
  const detected = spec ? detectAuth(spec) : 'token';
  info(detected === 'cookie' ? 'لقينا مؤشرات Sanctum SPA (cookie) في الملف.' : 'Bearer token (Sanctum personal access tokens) هو الافتراضي.');
  const authChoice =
    args.auth ||
    (await choose(
      'طريقة تسجيل الدخول؟',
      [
        { label: 'token', value: 'token', hint: 'Authorization: Bearer — الأبسط، يعمل مع أي دومين' },
        { label: 'cookie', value: 'cookie', hint: 'Sanctum SPA — يحتاج subdomains من نفس الدومين' },
      ],
      detected === 'cookie' ? 1 : 0,
    ));
  const auth = authChoice === 'cookie' ? 'cookie' : 'token';
  const urls = {
    site: await ask('عنوان المتجر (SITE_URL)', readEnvValue('web', 'NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000'),
    dashboard: await ask('عنوان اللوحة (DASHBOARD_URL)', readEnvValue('web', 'NEXT_PUBLIC_DASHBOARD_URL') || 'http://localhost:5173'),
  };

  // 5 · apply --------------------------------------------------------------------------------------------------------------
  step(5, TOTAL, 'كتابة الإعدادات');
  for (const id of appIds) {
    log(`  ${c.dim(`${APPS[id].env}  →  mode=laravel, URL=${apiUrl}, auth=${auth}`)}`);
    if (byApp[id]) log(`  ${c.dim(`${APPS[id].overrides}  →  ${Object.keys(byApp[id].overrides).length} مسار`)}`);
  }
  if (await confirm('أكتب الملفات الآن؟ (يتم أخذ نسخة .bak من أي ملف موجود)', true)) {
    for (const id of appIds) {
      const e = writeEnv(id, envVars(id, { mode: 'laravel', apiUrl, auth, urls }));
      ok(`${e.file}${e.backup ? c.dim(`  (نسخة: ${e.backup})`) : ''}`);
      if (byApp[id]) {
        const o = writeOverrides(id, byApp[id].overrides);
        ok(`${o.file}  ${c.dim(`${o.count} override`)}`);
      }
    }
  } else warn('لم تُكتب أي ملفات.');

  // 6 · probe --------------------------------------------------------------------------------------------------------------
  step(6, TOTAL, 'فحص السيرفر الحي');
  let probe = [];
  if (!args['no-probe'] && (await confirm('أفحص السيرفر الآن (CORS، الرد JSON، تسجيل الدخول، شكل البيانات)؟', true))) {
    const creds = args.email ? { email: args.email, password: args.password || '' } : await askCreds();
    probe = await probeAndPrint({ apiUrl, auth, creds });
  }
  const file = writeReport({ spec, apiUrl, auth, prefix, byApp, probe });

  log(`\n${c.bold('✔ خلصنا.')} التقرير للباك اند: ${c.bold(file)}`);
  log(c.dim('  التالي:'));
  log(c.dim('   1) أعد تشغيل التطبيقين (npm run dev:web / npm run dev:dashboard)'));
  log(c.dim('   2) صلّح ما ظهر ❌ ثم أعد الفحص:  npm run connect -- --check'));
  log(c.dim('   3) للرجوع إلى mock:  npm run connect -- --reset'));
  return undefined;
}

main()
  .catch((e) => {
    bad(e.message);
    process.exitCode = 1;
  })
  .finally(closeUI);
