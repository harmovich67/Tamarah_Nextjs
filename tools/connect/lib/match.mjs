/**
 * Matches the endpoints our adapters call (the "contract") against the routes found in the backend's API file.
 * Scoring = path similarity (0-100, 100 only for an identical shape) + name similarity (0-15) + method fit (0-15).
 */

const WRITE = ['POST', 'PUT', 'PATCH'];

const singular = (w) => {
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
};

const segs = (p) =>
  String(p)
    .toLowerCase()
    .split('/')
    .filter(Boolean)
    .map((s) => (/^\{.*\}$/.test(s) ? '{}' : s));

const wordsOf = (text) =>
  String(text)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(singular);

const tokenSet = (list) => new Set(list.flatMap((s) => (s === '{}' ? [] : wordsOf(s))));

const jaccard = (a, b) => {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  a.forEach((x) => b.has(x) && (inter += 1));
  return inter / (a.size + b.size - inter || 1);
};

/** Longest literal prefix (e.g. /api/v1) shared by most routes, never swallowing a segment our contract owns. */
export function detectPrefix(ops, contracts) {
  const roots = new Set(contracts.flat().map((e) => segs(e.template)[0]).filter(Boolean));
  const lists = ops.map((o) => segs(o.path));
  const candidates = lists.map((l) => {
    const out = [];
    for (const s of l) {
      if (s === '{}' || roots.has(s)) break;
      out.push(s);
    }
    return out;
  });
  const first = candidates.reduce((best, c) => (c.length > best.length ? c : best), []);
  for (let n = first.length; n > 0; n -= 1) {
    const prefix = first.slice(0, n);
    const share = lists.filter((l) => prefix.every((s, i) => l[i] === s)).length / (lists.length || 1);
    if (share >= 0.6) return prefix;
  }
  return [];
}

export function groupRoutes(ops, prefix) {
  const map = new Map();
  for (const op of ops) {
    const original = op.path.split('/').filter(Boolean);
    const lower = original.map((s) => s.toLowerCase());
    const strip = prefix.length && prefix.every((s, i) => lower[i] === s) ? prefix.length : 0;
    const path = `/${original.slice(strip).join('/')}`;
    if (!map.has(path)) map.set(path, { path, segs: segs(path), methods: new Set(), words: new Set(), ops: [] });
    const r = map.get(path);
    r.methods.add(op.method);
    r.ops.push(op);
    wordsOf(`${op.operationId} ${op.summary} ${op.tags.join(' ')}`).forEach((w) => r.words.add(w));
  }
  return [...map.values()];
}

export const paramCount = (p) => (String(p).match(/\{[^}]*\}/g) || []).length;

/** Convert `/pages/{slug}` into the positional template the adapters use: `/pages/{0}`. */
export function toTemplate(routePath) {
  let i = 0;
  return routePath.replace(/\{[^}]*\}/g, () => `{${i++}}`);
}

export const sameShape = (a, b) => segs(a).join('/') === segs(b).join('/');

function methodFit(expected, have) {
  if (!expected.length) return { fraction: 0.5, missing: [] };
  const missing = expected.filter((m) => {
    if (have.has(m)) return false;
    // Multipart updates are sent as POST + `_method`, so a PUT/PATCH route is fine for a POST call.
    return !(m === 'POST' && WRITE.some((w) => have.has(w)));
  });
  return { fraction: 1 - missing.length / expected.length, missing };
}

function score(entry, route) {
  const cs = segs(entry.template);
  const rs = route.segs;
  let path;
  if (cs.join('/') === rs.join('/')) path = 100;
  else {
    let trailing = 0;
    while (trailing < cs.length && trailing < rs.length && cs[cs.length - 1 - trailing] === rs[rs.length - 1 - trailing]) trailing += 1;
    const jac = jaccard(tokenSet(cs), tokenSet(rs));
    const conflict = cs.some((s, i) => rs[i] !== undefined && (s === '{}') !== (rs[i] === '{}'));
    path = 45 * (trailing / Math.max(cs.length, rs.length)) + 35 * jac + (paramCount(entry.template) === paramCount(route.path) ? 10 : 0) + (cs.length === rs.length ? 10 : 0);
    if (conflict) path *= 0.6;
    path = Math.min(path, 90);
  }
  const keyWords = wordsOf(entry.key).filter((w) => !['list', 'item'].includes(w));
  const haystack = new Set([...route.words, ...tokenSet(rs)]);
  const name = keyWords.length ? (15 * keyWords.filter((w) => haystack.has(w)).length) / keyWords.length : 0;
  const { fraction, missing } = methodFit(entry.methods, route.methods);
  const total = path + name + 15 * fraction;
  const confidence = (path === 100 && fraction >= 0.5) || total >= 90 ? 'high' : total >= 60 ? 'medium' : 'low';
  return { path, name, total, confidence, missingMethods: missing };
}

/** @returns {{ matches: object[], missing: object[], extra: object[], routes: object[] }} */
export function matchContract(contract, ops, prefix) {
  const routes = groupRoutes(ops, prefix);
  const pairs = [];
  for (const entry of contract) {
    for (const route of routes) {
      const s = score(entry, route);
      if (s.total >= 45) pairs.push({ entry, route, ...s });
    }
  }
  pairs.sort((a, b) => b.total - a.total);

  const usedEntries = new Set();
  const usedRoutes = new Set();
  const matches = [];
  for (const p of pairs) {
    if (p.confidence === 'low' || usedEntries.has(p.entry.key) || usedRoutes.has(p.route.path)) continue;
    usedEntries.add(p.entry.key);
    usedRoutes.add(p.route.path);
    matches.push({ ...p, candidates: pairs.filter((q) => q.entry.key === p.entry.key).slice(0, 3) });
  }
  const missing = contract
    .filter((e) => !usedEntries.has(e.key))
    .map((entry) => ({ entry, candidates: pairs.filter((q) => q.entry.key === entry.key).slice(0, 3) }));
  const extra = routes.filter((r) => !usedRoutes.has(r.path));
  return { matches, missing, extra, routes };
}

/** Build a match record for a path the person typed by hand. */
export function manualMatch(entry, routePath, routes) {
  const route = routes.find((r) => sameShape(r.path, routePath)) || { path: routePath, segs: segs(routePath), methods: new Set(), words: new Set(), ops: [] };
  const { missing } = methodFit(entry.methods, route.methods);
  return { entry, route, total: 100, path: 100, name: 0, confidence: 'manual', missingMethods: route.methods.size ? missing : [], candidates: [] };
}
