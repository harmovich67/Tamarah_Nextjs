import fs from 'node:fs';
import path from 'node:path';
import { APPS, abs, readJson } from './contract.mjs';
import { paramCount, toTemplate } from './match.mjs';

/** Accepted matches -> `{ key: '/path/{0}' }` for every path that differs from the documented contract. */
export function buildOverrides(matches) {
  const overrides = {};
  const issues = [];
  for (const m of matches) {
    const template = toTemplate(m.route.path);
    if (m.entry.arity !== paramCount(m.route.path)) {
      issues.push(`${m.entry.key}: المسار ${m.route.path} فيه ${paramCount(m.route.path)} متغير بينما الواجهة تمرر ${m.entry.arity}. لم يُكتب override.`);
      continue;
    }
    if (template !== m.entry.template) overrides[m.entry.key] = template;
  }
  return { overrides, issues };
}

function backup(file) {
  if (!fs.existsSync(file)) return null;
  const copy = `${file}.bak`;
  fs.copyFileSync(file, copy);
  return path.relative(abs('.'), copy);
}

export function writeOverrides(appId, overrides) {
  const file = abs(APPS[appId].overrides);
  const previous = readJson(APPS[appId].overrides, {});
  const bak = Object.keys(previous).length ? backup(file) : null;
  const sorted = Object.fromEntries(Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
  return { file: APPS[appId].overrides, count: Object.keys(sorted).length, backup: bak };
}

/** Merge KEY=VALUE pairs into an env file without touching unrelated lines. */
export function writeEnv(appId, vars) {
  const rel = APPS[appId].env;
  const file = abs(rel);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const bak = existing.length ? backup(file) : null;
  const pending = { ...vars };
  const lines = existing.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && m[1] in pending) {
      const v = pending[m[1]];
      delete pending[m[1]];
      return `${m[1]}=${v}`;
    }
    return line;
  });
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  Object.entries(pending).forEach(([k, v]) => lines.push(`${k}=${v}`));
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  return { file: rel, backup: bak };
}

export function envVars(appId, { mode, apiUrl, auth, urls }) {
  const p = APPS[appId].envPrefix;
  const base = { [`${p}API_MODE`]: mode, [`${p}API_URL`]: apiUrl, [`${p}AUTH_STRATEGY`]: auth };
  if (appId === 'web') return { ...base, NEXT_PUBLIC_SITE_URL: urls.site, NEXT_PUBLIC_DASHBOARD_URL: urls.dashboard };
  return { ...base, VITE_STOREFRONT_URL: urls.site };
}
