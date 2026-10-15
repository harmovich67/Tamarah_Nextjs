import fs from 'node:fs';
import { abs } from './contract.mjs';

const ICON = { pass: '✅', warn: '⚠️', fail: '❌' };

/** Writes docs/CONNECT_REPORT.md — a hand-off document for the backend developer. */
export function writeReport({ spec, apiUrl, auth, prefix, byApp, probe }) {
  const L = [];
  L.push('# تقرير ربط الـ API', '', `> أُنشئ تلقائيًا بواسطة \`npm run connect\` — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '');
  L.push(`- **API_URL:** \`${apiUrl}\``, `- **الـ Auth:** \`${auth}\``, `- **ملف الـ API:** ${spec ? `${spec.kind} (${spec.ops.length} عملية)` : 'لم يُستخدم'}`);
  if (prefix?.length) L.push(`- **البادئة المكتشفة:** \`/${prefix.join('/')}\``);
  L.push('');

  for (const [appId, r] of Object.entries(byApp || {})) {
    const total = r.matches.length + r.missing.length;
    L.push(`## ${r.label}`, '', `تمت مطابقة **${r.matches.length}/${total}** endpoint (تم كتابة ${Object.keys(r.overrides).length} override).`, '');

    const changed = r.matches.filter((m) => r.overrides[m.entry.key]);
    if (changed.length) {
      L.push('### مسارات تختلف عن العقد (تم ضبطها تلقائيًا)', '', '| المفتاح | العقد | الباك اند | الثقة |', '| --- | --- | --- | --- |');
      changed.forEach((m) => L.push(`| \`${m.entry.key}\` | \`${m.entry.template}\` | \`${m.route.path}\` | ${m.confidence} |`));
      L.push('');
    }
    const methodIssues = r.matches.filter((m) => m.missingMethods.length);
    if (methodIssues.length) {
      L.push('### اختلاف في الـ HTTP method', '', 'الواجهة ترسل method غير موجود على هذا المسار في الباك اند — عدّل الـ route أو الـ adapter:', '');
      methodIssues.forEach((m) => L.push(`- \`${m.entry.key}\` (${m.route.path}): الواجهة ترسل **${m.missingMethods.join(', ')}** والباك اند يملك **${[...m.route.methods].join(', ') || '—'}**`));
      L.push('');
    }
    if (r.missing.length) {
      L.push('### Endpoints مطلوبة وغير موجودة في الباك اند', '', '| المفتاح | المسار المتوقع | Method | أقرب مرشح |', '| --- | --- | --- | --- |');
      r.missing.forEach((m) => {
        const c = m.candidates[0];
        L.push(`| \`${m.entry.key}\` | \`${m.entry.template}\` | ${m.entry.methods.join(', ') || '—'} | ${c ? `\`${c.route.path}\` (${Math.round(c.total)})` : '—'} |`);
      });
      L.push('');
    }
    if (r.issues.length) L.push('### ملاحظات', '', ...r.issues.map((i) => `- ${i}`), '');
    if (r.extra.length) {
      L.push('<details><summary>مسارات في الباك اند لا تستخدمها هذه الواجهة (' + r.extra.length + ')</summary>', '', ...r.extra.map((x) => `- \`${[...x.methods].join('|')} ${x.path}\``), '', '</details>', '');
    }
  }

  if (probe?.length) {
    L.push('## فحص السيرفر الحي', '', '| | المجموعة | الفحص | التفاصيل |', '| --- | --- | --- | --- |');
    probe.forEach((p) => L.push(`| ${ICON[p.status]} | ${p.group} | ${p.name} | ${String(p.detail).replace(/\|/g, '\\|')} |`));
    const fixes = probe.filter((p) => p.status !== 'pass' && p.fix);
    if (fixes.length) {
      L.push('', '### المطلوب إصلاحه', '');
      fixes.forEach((p) => L.push(`- **${p.name}:** ${p.fix}`));
    }
    L.push('');
  }
  L.push('---', 'لإعادة التشغيل بعد أي تعديل في الباك اند: `npm run connect -- --check`');

  const file = abs('docs/CONNECT_REPORT.md');
  fs.mkdirSync(abs('docs'), { recursive: true });
  fs.writeFileSync(file, `${L.join('\n')}\n`);
  return 'docs/CONNECT_REPORT.md';
}
