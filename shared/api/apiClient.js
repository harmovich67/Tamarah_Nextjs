import { ApiError, ERROR_CODES } from './errors.js';

/**
 * Centralized HTTP client for the (future) Laravel API.
 *
 * Handles: base URL, auth (Bearer token OR Sanctum SPA cookie + XSRF), JSON / FormData, query
 * strings, Laravel validation (422), pagination envelopes, upload progress, timeouts, network
 * failures and session expiry. UI code and services never call fetch() directly.
 *
 * @typedef {object} ApiClientOptions
 * @property {string} baseUrl                         e.g. https://api.example.com/api  (NEXT_PUBLIC_API_URL / VITE_API_URL)
 * @property {'token'|'cookie'} [strategy='token']
 * @property {() => string|null|undefined} [getToken]
 * @property {() => string} [getLocale]
 * @property {(error: ApiError) => void} [onUnauthorized]  called on 401 (session expiry)
 * @property {number} [timeoutMs=20000]
 * @property {string} [csrfPath='/sanctum/csrf-cookie']    resolved against the API origin
 * @property {typeof fetch} [fetchImpl]
 */

/**
 * @param {ApiClientOptions} options
 */
export function createApiClient(options) {
  const {
    baseUrl = '',
    strategy = 'token',
    getToken = () => null,
    getLocale = () => 'ar',
    onUnauthorized = () => {},
    timeoutMs = 20000,
    csrfPath = '/sanctum/csrf-cookie',
    fetchImpl,
  } = options;

  const doFetch = (...args) => (fetchImpl || globalThis.fetch)(...args);

  function buildUrl(path, query) {
    const isAbsolute = /^https?:\/\//.test(path);
    const url = isAbsolute ? path : `${baseUrl.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
    return query ? `${url}${url.includes('?') ? '&' : '?'}${serializeQuery(query)}` : url;
  }

  function readCookie(name) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
  }

  async function ensureCsrfCookie() {
    if (strategy !== 'cookie') return;
    if (readCookie('XSRF-TOKEN')) return;
    const origin = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    await doFetch(`${origin}${csrfPath}`, { credentials: 'include' });
  }

  function buildHeaders(extra = {}, hasJsonBody = false) {
    const headers = {
      Accept: 'application/json',
      'Accept-Language': getLocale(),
      'X-Requested-With': 'XMLHttpRequest',
      ...extra,
    };
    if (hasJsonBody) headers['Content-Type'] = 'application/json';
    if (strategy === 'token') {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } else {
      const xsrf = readCookie('XSRF-TOKEN');
      if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    }
    return headers;
  }

  async function parseBody(response) {
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }
    return response.text().catch(() => null);
  }

  function toApiError(status, body) {
    const message = (body && typeof body === 'object' && body.message) || `HTTP ${status}`;
    let errors = (body && typeof body === 'object' && body.errors) || {};
    // The Tamrna backend sends validation errors as `data: { field: [messages] }` (no `errors` key).
    const d = body && typeof body === 'object' ? body.data : null;
    if (!Object.keys(errors).length && status === 422 && d && typeof d === 'object' && !Array.isArray(d) && Object.values(d).every(Array.isArray)) errors = d;
    let code = ERROR_CODES.HTTP;
    if (status === 401) code = ERROR_CODES.SESSION_EXPIRED;
    else if (status === 403) code = ERROR_CODES.FORBIDDEN;
    else if (status === 404) code = ERROR_CODES.NOT_FOUND;
    else if (status === 409) code = ERROR_CODES.CONFLICT;
    else if (status === 422) code = ERROR_CODES.VALIDATION;
    return new ApiError({ status, code, message, errors, data: body });
  }

  /**
   * @param {string} path
   * @param {object} [opts]
   * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [opts.method]
   * @param {object} [opts.query]
   * @param {any} [opts.body]            plain object (JSON) | FormData | undefined
   * @param {Record<string,string>} [opts.headers]
   * @param {AbortSignal} [opts.signal]
   * @param {number} [opts.timeoutMs]
   * @param {boolean} [opts.raw]         return the Response body untouched (blobs/downloads)
   */
  async function request(path, opts = {}) {
    const { method = 'GET', query, body, headers, signal, timeoutMs: t = timeoutMs, raw = false } = opts;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const hasJson = body !== undefined && !isForm;

    if (method !== 'GET') await ensureCsrfCookie();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), t);
    if (signal) signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });

    let response;
    try {
      response = await doFetch(buildUrl(path, query), {
        method,
        headers: buildHeaders(headers, hasJson),
        body: hasJson ? JSON.stringify(body) : isForm ? body : undefined,
        credentials: strategy === 'cookie' ? 'include' : 'same-origin',
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error?.name === 'TimeoutError' || controller.signal.reason?.name === 'TimeoutError') {
        throw new ApiError({ status: 0, code: ERROR_CODES.TIMEOUT, message: 'Request timed out' });
      }
      if (error?.name === 'AbortError') throw error; // caller-initiated cancellation (React Query)
      throw new ApiError({ status: 0, code: ERROR_CODES.NETWORK, message: error?.message || 'Network error' });
    }
    clearTimeout(timer);

    if (raw && response.ok) return response;
    const data = await parseBody(response);

    if (!response.ok) {
      const error = toApiError(response.status, data);
      if (response.status === 401) onUnauthorized(error);
      throw error;
    }
    return data;
  }

  /**
   * Multipart upload with progress callbacks (fetch has no upload progress, so XHR is used).
   * @param {string} path
   * @param {FormData} formData
   * @param {{ method?: 'POST'|'PUT'|'PATCH', onProgress?: (percent: number) => void, signal?: AbortSignal }} [opts]
   */
  async function upload(path, formData, opts = {}) {
    const { method = 'POST', onProgress, signal } = opts;
    await ensureCsrfCookie();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, buildUrl(path));
      const headers = buildHeaders();
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.withCredentials = strategy === 'cookie';
      xhr.timeout = Math.max(timeoutMs, 60000);
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      }
      xhr.onload = () => {
        let body = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          body = null;
        }
        if (xhr.status >= 200 && xhr.status < 300) return resolve(body);
        const error = toApiError(xhr.status, body);
        if (xhr.status === 401) onUnauthorized(error);
        reject(error);
      };
      xhr.onerror = () => reject(new ApiError({ status: 0, code: ERROR_CODES.NETWORK, message: 'Network error' }));
      xhr.ontimeout = () => reject(new ApiError({ status: 0, code: ERROR_CODES.TIMEOUT, message: 'Upload timed out' }));
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(formData);
    });
  }

  return {
    request,
    upload,
    get: (path, query, opts) => request(path, { ...opts, method: 'GET', query }),
    post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
    put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
    patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
    delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
    /** Download a file (backups, logs) as a Blob. */
    download: async (path, query) => (await request(path, { query, raw: true })).blob(),
    buildUrl,
  };
}

/** Laravel-friendly query serialization: arrays become key[]=a&key[]=b, nullish/empty are skipped. */
export function serializeQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, String(v)));
    else params.append(key, String(value));
  });
  return params.toString();
}

/**
 * Normalize Laravel paginators (`{ data, meta, links }` or the flat LengthAwarePaginator) into
 * `{ items, meta: { page, perPage, total, lastPage } }`.
 */
export function normalizePaginated(response) {
  if (Array.isArray(response)) {
    return { items: response, meta: { page: 1, perPage: response.length, total: response.length, lastPage: 1 } };
  }
  const items = response?.data ?? response?.items ?? [];
  const m = response?.meta ?? response ?? {};
  return {
    items,
    meta: {
      page: m.current_page ?? m.page ?? 1,
      perPage: m.per_page ?? m.perPage ?? items.length,
      total: m.total ?? items.length,
      lastPage: m.last_page ?? m.lastPage ?? 1,
    },
  };
}
