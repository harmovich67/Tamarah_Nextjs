import { apiClient as api } from '@/lib/apiClient';
import { endpoints as e } from '../../endpoints';
import { unwrap } from './helpers';

/** Laravel adapter for users & roles (same function names / shapes as adapters/mock/access.js). */
export const listUsers = async () => unwrap(await api.get(e.users.list)); // -> { users, roles }
export const createUser = async (v) => unwrap(await api.post(e.users.list, v));
export const updateUser = async (id, v) => unwrap(await api.put(e.users.item(id), v));
export const deleteUser = async (id) => api.delete(e.users.item(id));
