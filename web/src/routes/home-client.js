import { logHomeAuthQuery } from '$lib/auth/client-log.js';

export function logHomeAuth(data) {
  logHomeAuthQuery(data?.connected, data?.error, data?.authDebug);
}