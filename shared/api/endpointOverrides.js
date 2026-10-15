/**
 * Merge path overrides into an endpoint map.
 *
 * `base` holds strings, functions `(id) => '/x/' + id` and nested maps (`crud()` -> { list, item }).
 * `overrides` is flat, keyed by dotted path (`products.item`), values are path templates whose parameters are
 * positional: `/products/{0}/status/{1}`. Written by `npm run connect`.
 */
const fill = (template, args) => template.replace(/\{(\d+)\}/g, (_, i) => encodeURIComponent(String(args[Number(i)] ?? '')));

export function applyOverrides(base, overrides = {}) {
  const walk = (node, prefix) =>
    Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object') return [key, Object.freeze(walk(value, path))];
        const override = overrides[path];
        if (typeof override !== 'string') return [key, value];
        return [key, typeof value === 'function' ? (...args) => fill(override, args) : override];
      }),
    );
  return Object.freeze(walk(base, ''));
}
