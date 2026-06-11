import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'x', functionName: 'x/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'x:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const verifier = cookies.get('x_pkce_verifier');
  const expectedState = cookies.get('x_oauth_state');

  if (!code || !verifier || state !== expectedState) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      hasVerifier: Boolean(verifier),
      stateMatch: state === expectedState,
      error: 'x_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'X callback invalid state/verifier/code');
    flashAuthDebug(cookies, 'x', invalid);
    throw redirect(303, '/?error=x_auth_failed');
  }

  try {
    const clientId = mustEnv('X_CLIENT_ID');
    const clientSecret = mustEnv('X_CLIENT_SECRET');
    const redirectUri = `${redirectBase()}/auth/x/callback`;

    stepLog.info({ functionName: 'GET', phase: 'exchange:start' }, 'Starting X token exchange');
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

    stepLog.info({ functionName: 'GET', phase: 'user:fetch:start' }, 'Fetching X user');
    const meRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json();
    const username = me.data?.username || me.data?.id || 'user';

    tokenData.username = username;
    const pathname = tokenPath('x', username);
    stepLog.info({ functionName: 'GET', phase: 'store:save:start', pathname }, 'Saving X token');

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, tokenData);

    cookies.delete('x_pkce_verifier', { path: '/' });
    cookies.delete('x_oauth_state', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', username }, 'X connect success');
    throw redirect(303, '/?connected=x');
  } catch (err) {
    if (err?.status === 303) throw err;
    const serverError = err.message || 'X callback failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      `X callback failed: ${serverError}`,
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'x', failed);
    throw redirect(303, '/?error=x_auth_failed');
  }
}