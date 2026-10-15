import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { toFormData, unwrap } from './helpers';

/** Laravel adapter for the system screens (same function names / shapes as adapters/mock/system.js). */
export const listTranslations = async () => unwrap(await api.get(e.translations));
export const saveTranslation = async ({ key, ar, en }) => unwrap(await api.put(e.translation(key), { ar, en }));
export const deleteTranslation = async (key) => api.delete(e.translation(key));

export const getCacheStats = async () => unwrap(await api.get(e.cache));
export const clearCache = async (group = 'all') => unwrap(await api.post(e.cacheClear, { group }));
export const preloadCache = async () => unwrap(await api.post(e.cachePreload));

export const listLogs = async (params) => unwrap(await api.get(e.logs, params)); // -> { logs, stats, channels }
export const clearLogs = async () => unwrap(await api.delete(e.logs));
export const downloadLogs = async () => ({ filename: `logs_${Date.now()}.log`, blob: await api.download(e.logsDownload) });

export const getSecurity = async () => unwrap(await api.get(e.security));
export const updateSecuritySettings = async (v) => unwrap(await api.put(e.securitySettings, v));
export const blockIp = async (v) => unwrap(await api.post(e.securityBlockedIps, v));
export const unblockIp = async (ip) => unwrap(await api.delete(e.securityBlockedIp(ip)));

export const listBackups = async () => unwrap(await api.get(e.backups)); // -> { backups, auto }
export const generateBackup = async () => unwrap(await api.post(e.backups));
export const deleteBackup = async (id) => api.delete(e.backup(id));
export const downloadBackup = async (id) => ({ filename: `backup_${id}.zip`, blob: await api.download(e.backupDownload(id)) });
export const restoreBackup = async ({ id, file }) => unwrap(await api.post(e.backupRestore, file ? toFormData({ file }) : { id }));
export const saveBackupSchedule = async (v) => unwrap(await api.put(e.backupSettings, v));
