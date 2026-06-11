import { redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { metaAuthUrl } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';

export function load({ cookies }) {
  const state = randomState();
  cookies.set('meta_oauth_state_facebook', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

  const url = metaAuthUrl({
    appId: mustEnv('META_APP_ID'),
    redirectUri: `${redirectBase()}/auth/facebook/callback`,
    scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
    state,
  });

  throw redirect(302, url);
}