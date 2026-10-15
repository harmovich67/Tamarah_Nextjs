import { assetUrl } from '@tamrna/shared/utils';

/** `asset('assets/images/x.webp')` -> `/assets/images/x.webp` (public folder), absolute URLs pass through. */
export const asset = (path) => assetUrl(path, '');

/** Fallback product image used by the cart drawer when a line has none. */
export const FALLBACK_IMAGE = 'assets/images/home/ajwa.webp';
