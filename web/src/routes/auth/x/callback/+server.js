import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const verifier = cookies.get('x_pkce_verifier');
  const expectedState = cookies.get('x_oauth_state');

  if (!code || !verifier || state !== expectedState) {
    logAuth('x', 'callback:invalid', authEntry('failed', {
      hasCode: Boolean(code),
      hasVerifier: Boolean(verifier),
      stateMatch: state === expectedState,
      error: 'x_auth_failed',
    }));
    throw redirect(303, '/?error=x_auth_failed');
  }

  try {
    const clientId = mustEnv('X_CLIENT_ID');
    const clientSecret = mustEnv('X_CLIENT_SECRET');
    const redirectUri = `${redirectBase()}/auth/x/callback`;

    const tokenData = await exchangeCode({
      tokenUrl: 'https://api.x.com/2/oauth2/token',
      body: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
        client_id: clientId,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    });

    const meRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json();
    const username = me.data?.username || me.data?.id || 'user';

    tokenData.username = username;
    await saveToken(tokenPath('x', username), tokenData);

    cookies.delete('x_pkce_verifier', { path: '/' });
    cookies.delete('x_oauth_state', { path: '/' });

    logAuth('x', 'callback:success', authEntry('success', { username }));
    throw redirect(303, '/?connected=x');
  } catch (err) {
    if (err?.status === 303) throw err;
    logAuth('x', 'callback:failed', authEntry('failed', { error: serializeError(err) }));
    throw redirect(303, '/?error=x_auth_failed');
  }
}