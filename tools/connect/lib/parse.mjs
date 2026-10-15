import fs from 'node:fs';
import YAML from 'yaml';

const HTTP = ['get', 'post', 'put', 'patch', 'delete'];

const cleanPath = (p) => {
  let s = String(p || '')
    .split('?')[0]
    .replace(/\{\{\s*([\w-]+)\s*\}\}/g, '{$1}')
    .replace(/\/:([\w-]+)/g, '/{$1}');
  s = s.replace(/^https?:\/\/[^/]+/i, '');
  s = `/${s}`.replace(/\/{2,}/g, '/');
  return s.length > 1 ? s.replace(/\/$/, '') : s;
};

function fromOpenApi(doc) {
  const ops = [];
  const swagger2Base = doc.basePath || '';
  for (const [p, item] of Object.entries(doc.paths || {})) {
    for (const m of HTTP) {
      const op = item?.[m];
      if (!op) continue;
      ops.push({ method: m.toUpperCase(), path: cleanPath(swagger2Base + p), operationId: op.operationId || '', summary: op.summary || '', tags: op.tags || [] });
    }
  }
  const schemes = doc.components?.securitySchemes || doc.securityDefinitions || {};
  const types = Object.values(schemes).map((s) => `${s.type}:${s.scheme || s.in || ''}`.toLowerCase());
  const servers = (doc.servers || []).map((s) => s.url);
  if (doc.host) servers.push(`${(doc.schemes || ['https'])[0]}://${doc.host}${doc.basePath || ''}`);
  return { kind: 'OpenAPI', ops, servers, authHints: types };
}

function fromPostman(doc) {
  const ops = [];
  const walk = (items, tags) => {
    for (const it of items || []) {
      if (it.item) walk(it.item, [...tags, it.name]);
      else if (it.request) {
        const url = it.request.url;
        const raw = typeof url === 'string' ? url : url?.raw || `/${(url?.path || []).join('/')}`;
        ops.push({ method: String(it.request.method || 'GET').toUpperCase(), path: cleanPath(raw), operationId: '', summary: it.name || '', tags });
      }
    }
  };
  walk(doc.item, []);
  const vars = (doc.variable || []).map((v) => v.value).filter((v) => /^https?:/.test(v || ''));
  return { kind: 'Postman', ops, servers: vars, authHints: [JSON.stringify(doc.auth || '').toLowerCase()] };
}

/** Output of `php artisan route:list --json`. */
function fromRouteList(rows) {
  const ops = [];
  for (const r of rows) {
    const methods = String(r.method || '')
      .split('|')
      .filter((m) => m && m !== 'HEAD' && m !== 'OPTIONS');
    for (const method of methods) ops.push({ method, path: cleanPath(r.uri), operationId: r.name || '', summary: '', tags: [] });
  }
  const cookie = rows.some((r) => String(r.uri).includes('sanctum/csrf-cookie'));
  return { kind: 'Laravel route:list', ops, servers: [], authHints: cookie ? ['cookie:sanctum'] : [] };
}

export function parseSpec(file) {
  const text = fs.readFileSync(file, 'utf8');
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    doc = YAML.parse(text);
  }
  let parsed;
  if (doc?.openapi || doc?.swagger) parsed = fromOpenApi(doc);
  else if (doc?.info && Array.isArray(doc.item)) parsed = fromPostman(doc);
  else if (Array.isArray(doc) && doc.length && 'uri' in doc[0]) parsed = fromRouteList(doc);
  else throw new Error('صيغة الملف غير معروفة. المدعوم: OpenAPI/Swagger (json/yaml) أو Postman Collection أو ناتج php artisan route:list --json');

  const seen = new Set();
  parsed.ops = parsed.ops.filter((o) => {
    const k = `${o.method} ${o.path}`;
    if (seen.has(k) || /^\/(_ignition|_debugbar|telescope|horizon|up$)/.test(o.path)) return false;
    seen.add(k);
    return true;
  });
  return parsed;
}

export function detectAuth(parsed) {
  const h = parsed.authHints.join(' ');
  if (/cookie|sanctum/.test(h) || parsed.ops.some((o) => o.path.includes('sanctum/csrf-cookie'))) return 'cookie';
  return 'token';
}
