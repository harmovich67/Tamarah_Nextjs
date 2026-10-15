import { config } from '@/lib/config';
import * as mock from './adapters/mock';
import * as laravel from './adapters/laravel';

/**
 * Service facade. UI code imports `contentService`, `cartService`, ... and never learns whether the mock or the
 * Laravel adapter is behind them. Switch with NEXT_PUBLIC_API_MODE=mock|laravel.
 */
const adapter = config.apiMode === 'laravel' ? laravel : mock;

export const contentService = adapter.content;
export const catalogService = adapter.catalog;
export const cartService = adapter.cart;
export const checkoutService = adapter.checkout;
export const authService = adapter.auth;
export const accountService = adapter.account;
