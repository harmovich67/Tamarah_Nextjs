import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { unwrap } from './helpers';

/** Laravel adapter: coupons + shipping zones (same function names / shapes as adapters/mock/commerce.js). */
export const listCoupons = async () => unwrap(await api.get(e.coupons.list));
export const createCoupon = async (v) => unwrap(await api.post(e.coupons.list, v));
export const updateCoupon = async (id, v) => unwrap(await api.put(e.coupons.item(id), v));
export const deleteCoupon = async (id) => api.delete(e.coupons.item(id));
export const toggleCoupon = async (id) => unwrap(await api.post(e.couponToggle(id)));

export const listShippingZones = async () => unwrap(await api.get(e.shippingZones.list));
export const createShippingZone = async (v) => unwrap(await api.post(e.shippingZones.list, v));
export const updateShippingZone = async (id, v) => unwrap(await api.put(e.shippingZones.item(id), v));
export const deleteShippingZone = async (id) => api.delete(e.shippingZones.item(id));
export const toggleShippingZone = async (id) => unwrap(await api.post(e.shippingZoneToggle(id)));
