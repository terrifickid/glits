import { authFormEnhance, logPageAuthErrors } from '$lib/auth/client-log.js';

export const mastodonFormEnhance = authFormEnhance('mastodon');

export function logMastodonPageAuth(page) {
  logPageAuthErrors('mastodon', page);
}