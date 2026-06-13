import { redirect } from '@sveltejs/kit';
import { redirectBase, mustEnv } from '$lib/env.js';
import { authEntry, logAuth } from '$lib/auth/verbose.js';
import { buildAuthHeader } from '$lib/oauth1.js';

// Elemental OAuth 1.0a 3-legged flow (per X docs, no PKCE/S256/challenge)
export async function load({ cookies }) {
  const consumerKey = mustEnv('X_CONSUMER_KEY');
  const consumerSecret = mustEnv('X_CONSUMER_SECRET');
  const redirectUri = `${redirectBase()}/auth/x/callback`;

  // Step 1: POST oauth/request_token (signed with consumer only + oauth_callback)
  const requestTokenUrl = 'https://api.x.com/oauth/request_token';
  const requestParams = {
    oauth_callback: redirectUri,
  };
  const authHeader = buildAuthHeader({
    consumerKey,
    consumerSecret,
    method: 'POST',
    url: requestTokenUrl,
    extraParams: requestParams,
  });

  const requestTokenRes = await fetch(requestTokenUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(requestParams),
  });

  if (!requestTokenRes.ok) {
    const text = await requestTokenRes.text();
    throw new Error(`OAuth1 request_token failed: ${requestTokenRes.status} ${text}`);
  }

  const requestTokenText = await requestTokenRes.text();
  const requestTokenParams = new URLSearchParams(requestTokenText);
  const oauthToken = requestTokenParams.get('oauth_token');
  const oauthTokenSecret = requestTokenParams.get('oauth_token_secret');
  const callbackConfirmed = requestTokenParams.get('oauth_callback_confirmed');

  if (!oauthToken || !oauthTokenSecret || callbackConfirmed !== 'true') {
    throw new Error('Invalid request_token response from X');
  }

  // Store temp secret in cookie for the exchange step
  cookies.set('x_oauth1_temp_secret', oauthTokenSecret, {
    path: '/',
    httpOnly: true,
    maxAge: 600,
    sameSite: 'lax',
  });

  logAuth('x', 'oauth:redirect', authEntry('oauth:redirect', {}));

  // Step 2: Redirect to authorize (simple, no challenge/S256)
  throw redirect(302, `https://api.x.com/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`);
}