import { redirect } from '@sveltejs/kit';
import { pkce, randomState } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { authEntry, logAuth } from '$lib/auth/verbose.js';

export function load({ cookies }) {
  const { verifier, challenge } = pkce();
  const state = randomState();

  cookies.set('x_pkce_verifier', verifier, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
  cookies.set('x_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: mustEnv('X_CLIENT_ID'),
    redirect_uri: `${redirectBase()}/auth/x/callback`,
    scope: 'tweet.read tweet.write users.read offline.access media.write',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  logAuth('x', 'oauth:redirect', authEntry('oauth:redirect', { state }));
  throw redirect(302, `https://twitter.com/i/oauth2/authorize?${params}`);
}