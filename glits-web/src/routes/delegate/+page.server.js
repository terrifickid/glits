import { readAuthDebug } from '$lib/auth/load-debug.js';

export function load({ url, cookies }) {
  return {
    connected: url.searchParams.get('connected'),
    error: url.searchParams.get('error'),
    authDebug: readAuthDebug(cookies),
  };
}