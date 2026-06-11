import { redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { authEntry, logAuth } from '$lib/auth/verbose.js';

export function load({ cookies }) {
  const state = randomState();
  cookies.set('linkedin_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: mustEnv('LINKEDIN_CLIENT_ID'),
    redirect_uri: `${redirectBase()}/auth/linkedin/callback`,
    scope: 'openid profile w_member_social',
    state,
  });

  logAuth('linkedin', 'oauth:redirect', authEntry('oauth:redirect', { state }));
  throw redirect(302, `https://www.linkedin.com/oauth/v2/authorization?${params}`);
}