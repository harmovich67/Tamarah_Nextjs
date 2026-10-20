/**
 * Unified API error model.
 *
 * Every failure (HTTP status, validation, network, timeout, session expiry) is converted into an
 * ApiError so UI code never inspects raw Response objects or Laravel exception payloads.
 */

export const ERROR_CODES = Object.freeze({
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  VALIDATION: 'VALIDATION_ERROR',
  HTTP: 'HTTP_ERROR',
  UNKNOWN: 'UNKNOWN',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
});

export class ApiError extends Error {
  /**
   * @param {object} p
   * @param {number} [p.status]                 HTTP status (0 for network / timeout)
   * @param {string} [p.code]                   one of ERROR_CODES
   * @param {string} [p.message]                server (or fallback) message — never shown raw to users
   * @param {Record<string,string[]>} [p.errors] Laravel validation errors keyed by field
   * @param {any} [p.data]                      parsed response body
   */
  constructor({ status = 0, code = ERROR_CODES.UNKNOWN, message = 'Request failed', errors = {}, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.data = data;
  }

  /** First validation message for a field, if any. */
  fieldError(field) {
    const list = this.errors?.[field];
    return Array.isArray(list) ? list[0] : list;
  }
}

/** @param {unknown} e @returns {e is ApiError} */
export const isApiError = (e) => e instanceof ApiError || (e && e.name === 'ApiError');

const MESSAGES = {
  ar: {
    400: 'تعذر تنفيذ الطلب. يرجى مراجعة البيانات والمحاولة مرة أخرى.',
    401: 'انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد.',
    403: 'ليست لديك صلاحية للقيام بهذا الإجراء.',
    404: 'لم يتم العثور على المطلوب.',
    409: 'تعارض في البيانات. قد يكون هناك تعديل أحدث، يرجى التحديث والمحاولة مجددًا.',
    422: 'بعض الحقول غير صحيحة. يرجى مراجعتها.',
    429: 'عدد كبير من المحاولات. يرجى الانتظار قليلًا ثم المحاولة مجددًا.',
    500: 'حدث خطأ غير متوقع في الخادم. تم تسجيل المشكلة، يرجى المحاولة لاحقًا.',
    503: 'الخدمة غير متاحة مؤقتًا. يرجى المحاولة بعد قليل.',
    network: 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
    timeout: 'استغرق الطلب وقتًا أطول من المعتاد. يرجى المحاولة مجددًا.',
    session: 'انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد.',
    fallback: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  },
  en: {
    400: 'The request could not be completed. Please review the details and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested item could not be found.',
    409: 'A data conflict occurred. Please refresh and try again.',
    422: 'Some fields are invalid. Please review them.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'An unexpected server error occurred. Please try again later.',
    503: 'The service is temporarily unavailable. Please try again shortly.',
    network: 'Unable to reach the server. Check your internet connection.',
    timeout: 'The request took too long. Please try again.',
    session: 'Your session has expired. Please sign in again.',
    fallback: 'Something went wrong. Please try again.',
  },
};

/** `{ success:false | status:'fail', message }` answers with a readable message (not an untranslated key such as `general.messages.x`). */
function isBackendFailure(error) {
  const body = error.data;
  const flagged = body && typeof body === 'object' && (body.success === false || body.status === 'fail');
  return !!flagged && typeof error.message === 'string' && !/^[a-z_]+(\.[a-z_]+)+$/.test(error.message);
}

/**
 * Map any thrown value to a friendly, localized message.
 * Server messages are used only for 4xx business errors that are safe to display
 * (e.g. "coupon expired"); 5xx / unknown errors never leak raw exceptions.
 *
 * @param {unknown} error
 * @param {'ar'|'en'} [locale]
 */
export function toFriendlyMessage(error, locale = 'ar') {
  const m = MESSAGES[locale] || MESSAGES.ar;
  if (!isApiError(error)) return m.fallback;
  if (error.code === ERROR_CODES.NETWORK) return m.network;
  if (error.code === ERROR_CODES.TIMEOUT) return m.timeout;
  const status = error.status;
  // Business 4xx replies flagged by the API ({ success:false, message }) win over generic text — e.g. "wrong password" is a 401
  // that is not a session expiry. A bare "Unauthenticated." from Laravel has no flag and falls through to the session message.
  if ([400, 401, 403, 404, 409, 429].includes(status) && error.message && isBackendFailure(error)) return error.message;
  if (error.code === ERROR_CODES.SESSION_EXPIRED) return m.session;
  if (status >= 500) return m[status] || m[500];
  if (status === 422) {
    const first = Object.values(error.errors || {}).flat()[0];
    // e.g. "The code is incorrect": a 422 whose only content is the backend message.
    return first || (isBackendFailure(error) && error.message) || m[422];
  }
  return m[status] || (error.message && status < 500 ? error.message : m.fallback);
}
