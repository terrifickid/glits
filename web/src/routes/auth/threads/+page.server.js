import { redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { metaAuthUrl } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';

export function load({ cookies }) {
  const state = randomState();
  cookies.set('meta_oauth_state_threads', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

  const url = metaAuthUrl({
    appId: mustEnv('META_APP_ID'),
    redirectUri: `${redirectBase()}/auth/threads/callback`,
    scope: 'threads_basic,threads_content_publish',
    state,
  });

  throw redirect(302, url);
}