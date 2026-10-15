/** Only same-site relative paths are accepted as post-login redirect targets (prevents open redirects). */
export function safeRedirect(target, fallback = '/profile') {
  if (typeof target !== 'string') return fallback;
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
  return target;
}
