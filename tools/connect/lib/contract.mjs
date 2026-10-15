import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = path.resolve(import.meta.dirname, '../../..');

export const APPS = {
  web: {
    id: 'web',
    label: 'المتجر (Next.js)',
    base: 'web/services/endpoints.base.js',
    overrides: 'web/services/endpoints.overrides.json',
    adapters: 'web/services/adapters/laravel',
    env: 'web/.env.local',
    envPrefix: 'NEXT_PUBLIC_',
  },
  dashboard: {
    id: 'dashboard',
    label: 'لوحة التحكم (Vite)',
    base: 'dashboard/src/services/endpoints.base.js',
    overrides: 'dashboard/src/services/endpoints.overrides.json',
    adapters: 'dashboard/src/services/adapters/laravel',
    env: 'dashboard/.env.local',
    envPrefix: 'VITE_',
  },
};

export const abs = (rel) => path.join(ROOT, rel);

/** Methods each endpoint key is called with, scanned from the Laravel adapters so nothing is maintained twice. */
function scanMethods(app) {
  const dir = abs(app.adapters);
  const found = new Map();
  const re = /\b(?:api|apiClient)\.(get|post|put|patch|delete|download|upload)\(\s*e\.([A-Za-z0-9_.]+)/g;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const [, verb, key] of src.matchAll(re)) {
      const method = verb === 'download' ? 'GET' : verb === 'upload' ? 'POST' : verb.toUpperCase();
      if (!found.has(key)) found.set(key, new Set());
      found.get(key).add(method);
    }
  }
  return found;
}

function flatten(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.push({ key: full, template: value, arity: 0 });
    else if (typeof value === 'function') {
      const arity = value.length || 1;
      const probe = value(...Array.from({ length: arity }, (_, i) => `__P${i}__`));
      out.push({ key: full, template: probe.replace(/__P(\d)__/g, '{$1}'), arity });
    } else if (value && typeof value === 'object') flatten(value, full, out);
  }
}

/** @returns {Promise<Array<{app:string,key:string,template:string,arity:number,methods:string[]}>>} */
export async function loadContract(appId) {
  const app = APPS[appId];
  const mod = await import(pathToFileURL(abs(app.base)).href);
  const methods = scanMethods(app);
  const out = [];
  flatten(mod.default, '', out);
  return out.map((e) => ({ ...e, app: appId, methods: [...(methods.get(e.key) || [])] }));
}

export const readJson = (rel, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
  } catch {
    return fallback;
  }
};
