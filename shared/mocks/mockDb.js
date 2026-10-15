import { safeStorage } from '../api/storage.js';
import { buildSeed } from './seed.js';
import { nowSql } from '../utils/index.js';

/**
 * A tiny relational "database" that persists to localStorage so the mock adapters behave like a
 * real backend across page loads (cart, orders, admin edits...). Each application passes its own
 * namespace, so the storefront and the dashboard do not overwrite each other.
 *
 * On the server (SSR) localStorage is unavailable, so the seed is served from memory.
 */

const DB_VERSION = 4;

/** @param {{ namespace: string }} options */
export function createMockDb({ namespace }) {
  const key = `${namespace}.db.v${DB_VERSION}`;
  let state = null;

  function load() {
    if (state) return state;
    const stored = safeStorage.getJson(key, null);
    state = stored && typeof stored === 'object' ? stored : buildSeed();
    return state;
  }

  function persist() {
    safeStorage.setJson(key, state);
  }

  const db = {
    /** Restore the pristine seed (used by the "reset demo data" action and tests). */
    reset() {
      state = buildSeed();
      persist();
    },
    /** @param {string} table */
    all(table) {
      return load()[table] || [];
    },
    table(table) {
      const s = load();
      if (!s[table]) s[table] = [];
      return s[table];
    },
    find(table, id) {
      return db.all(table).find((r) => String(r.id) === String(id)) || null;
    },
    where(table, predicate) {
      return db.all(table).filter(predicate);
    },
    nextId(table) {
      return db.all(table).reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
    },
    insert(table, row) {
      const rec = { id: db.nextId(table), created_at: nowSql(), ...row };
      db.table(table).push(rec);
      persist();
      return rec;
    },
    update(table, id, patch) {
      const rec = db.find(table, id);
      if (!rec) return null;
      Object.assign(rec, patch, 'updated_at' in rec || patch.updated_at ? { updated_at: nowSql() } : {});
      persist();
      return rec;
    },
    remove(table, id) {
      const rows = db.table(table);
      const idx = rows.findIndex((r) => String(r.id) === String(id));
      if (idx === -1) return false;
      rows.splice(idx, 1);
      persist();
      return true;
    },
    removeWhere(table, predicate) {
      const s = load();
      s[table] = (s[table] || []).filter((r) => !predicate(r));
      persist();
    },
    /** Replace a whole table (re-ordering, bulk saves). */
    replace(table, rows) {
      load()[table] = rows;
      persist();
    },
    getSettings() {
      return load().settings || {};
    },
    getSetting(name, fallback = null) {
      const v = db.getSettings()[name];
      return v === undefined || v === null ? fallback : v;
    },
    setSettings(patch) {
      const s = load();
      s.settings = { ...(s.settings || {}), ...patch };
      persist();
      return s.settings;
    },
    /** Snapshot for backups/exports. */
    snapshot() {
      return JSON.parse(JSON.stringify(load()));
    },
    restore(snapshot) {
      state = JSON.parse(JSON.stringify(snapshot));
      persist();
    },
  };

  return db;
}

/** Simulated network latency so loading states are visible in mock mode. */
export const mockLatency = (ms = 180) =>
  typeof window === 'undefined' ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
