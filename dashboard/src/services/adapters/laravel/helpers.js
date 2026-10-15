/** Laravel responses are `{ success, data }`; bare payloads are accepted too. */
export const unwrap = (res) => (res && typeof res === 'object' && !Array.isArray(res) && 'data' in res ? res.data : res);

/**
 * Plain object -> FormData for multipart endpoints. Files are appended as-is (no base64), nested objects /
 * arrays become `a[b]` / `a[0]` keys the way Laravel expects, booleans become 1 / 0.
 */
export function toFormData(values, form = new FormData(), prefix = '') {
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value instanceof File || value instanceof Blob) form.append(name, value);
    else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v instanceof File || v instanceof Blob) form.append(`${name}[${i}]`, v);
        else if (typeof v === 'object' && v !== null) toFormData(v, form, `${name}[${i}]`);
        else form.append(`${name}[${i}]`, String(v));
      });
    } else if (typeof value === 'object') toFormData(value, form, name);
    else form.append(name, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });
  return form;
}
