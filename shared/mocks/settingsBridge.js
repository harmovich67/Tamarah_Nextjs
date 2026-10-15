/**
 * Mock-mode only: carries the dashboard's `settings` to the storefront.
 *
 * The two apps run on different origins (:5173 and :3000), so each has its own localStorage database and a plain
 * save in the dashboard is invisible to the storefront. After every settings save the dashboard loads the
 * storefront's `/mock-bridge` page in a hidden iframe and posts the settings to it; that page stores them under
 * SETTINGS_OVERRIDE_KEY and the storefront's mock db merges them over its seed. A real Laravel API makes all of
 * this unnecessary (both apps then read the same `settings` table).
 */

export const SETTINGS_OVERRIDE_KEY = 'tamrna.web.settings.override';
export const BRIDGE_PATH = '/mock-bridge';
export const BRIDGE_MESSAGE = 'tamrna:settings';

const SECRET_KEY = /secret|hmac|api_key|token|password/i;

const MAX_VALUE_LENGTH = 100_000; // an uploaded logo stored as a data URL would blow the storefront's localStorage quota

/** Settings that are safe to hand to the storefront (gateway credentials never leave the dashboard). */
export function publicSettings(all = {}) {
  return Object.fromEntries(Object.entries(all).filter(([k, v]) => !SECRET_KEY.test(k) && String(v ?? '').length <= MAX_VALUE_LENGTH));
}

/**
 * Push settings to the storefront origin. Resolves once the storefront acknowledged (or after a short timeout).
 * @param {string} storefrontUrl e.g. http://localhost:3000
 * @param {Record<string, unknown>} settings
 */
export function publishSettingsToStorefront(storefrontUrl, settings) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  let origin;
  try {
    origin = new URL(storefrontUrl).origin;
  } catch {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.src = origin + BRIDGE_PATH;
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    const done = (ok) => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve(ok);
    };
    const onMessage = (e) => {
      if (e.origin === origin && e.data?.type === `${BRIDGE_MESSAGE}:ack`) done(true);
    };
    const timer = setTimeout(() => done(false), 4000);
    window.addEventListener('message', onMessage);
    frame.onload = () => frame.contentWindow?.postMessage({ type: BRIDGE_MESSAGE, settings: publicSettings(settings) }, origin);
    document.body.appendChild(frame);
  });
}
