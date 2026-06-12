import { redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { authEntry, logAuth } from '$lib/auth/verbose.js';

export function load({ cookies }) {
  const state = randomState();
  cookies.set('google_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

  const params = new URLSearchParams({
    client_id: mustEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: `${redirectBase()}/auth/youtube/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  logAuth('youtube', 'oauth:redirect', authEntry('oauth:redirect', { state }));
  throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}