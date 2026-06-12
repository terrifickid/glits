import { authFormEnhance, logPageAuthErrors } from '$lib/auth/client-log.js';

export const blueskyFormEnhance = authFormEnhance('bluesky');

export function logBlueskyPageAuth(page) {
  logPageAuthErrors('bluesky', page);
}