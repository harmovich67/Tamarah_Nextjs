import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';

/** Laravel adapter for payment + site settings (same function names / shapes as adapters/mock/settings.js). */
export const getPaymentSettings = async () => unwrap(await api.get(e.paymentSettings));
export const updatePaymentSettings = async (values) => unwrap(await api.put(e.paymentSettings, values));
export const testPaymentConnection = async ({ provider, config }) => unwrap(await api.post(e.paymentTest, { provider, ...config }));
export const getSiteSettings = async () => unwrap(await api.get(e.siteSettings));
// multipart because of the logo upload
export const updateSiteSettings = async (values) => unwrap(await api.post(e.siteSettings, toFormData({ ...values, _method: 'PUT' })));
