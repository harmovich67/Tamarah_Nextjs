/**
 * Safe key/value storage used by the mock layer and by auth/session persistence.
 * localStorage when available (browser), otherwise an in-memory Map (SSR, private mode, tests).
 */
const memory = new Map();

function ls() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__tamrna_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    /* storage blocked */
  }
  return null;
}

export const safeStorage = {
  /** @param {string} key */
  get(key) {
    const store = ls();
    if (store) {
      try {
        return store.getItem(key);
      } catch {
        /* fall through */
      }
    }
    return memory.has(key) ? memory.get(key) : null;
  },
  /** @param {string} key @param {string} value */
  set(key, value) {
    const store = ls();
    if (store) {
      try {
        store.setItem(key, value);
        return;
      } catch {
        /* fall through */
      }
    }
    memory.set(key, value);
  },
  /** @param {string} key */
  remove(key) {
    const store = ls();
    if (store) {
      try {
        store.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    memory.delete(key);
  },
  /** @param {string} key @param {any} fallback */
  getJson(key, fallback = null) {
    const raw = this.get(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  /** @param {string} key @param {any} value */
  setJson(key, value) {
    this.set(key, JSON.stringify(value));
  },
};
