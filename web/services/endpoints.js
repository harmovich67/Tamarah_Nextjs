import { applyOverrides } from '@tamrna/shared/api';
import base from './endpoints.base';
import overrides from './endpoints.overrides.json';

/**
 * The endpoint map used by the Laravel adapters. `endpoints.base.js` is the documented contract (docs/API_CONTRACT.md);
 * `endpoints.overrides.json` is written by `npm run connect` when the real backend uses different paths.
 */
export const endpoints = applyOverrides(base, overrides);
