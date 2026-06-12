import { redirect } from '@sveltejs/kit';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';
import { buildAuthHeader } from '$lib/oauth1.js';

const fnLog = log.child({ provider: 'x', functionName: 'x/callback/+server.js:GET' });

// Elemental OAuth 1.0a callback (Step 3 per exact X docs, no PKCE)
export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'x:callback:start' });
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const state = url.searchParams.get('state');
  const tempSecret = cookies.get('x_oauth1_temp_secret');
  const expectedState = cookies.get('x_oauth_state');

  const issues = [];

  if (!oauthToken) {
    issues.push("No 'oauth_token' was present in the callback from X after the user authorized. This is the temporary request token needed to complete step 3.");
  }
  if (!oauthVerifier) {
    issues.push("No 'oauth_verifier' was present in the callback from X after the user authorized. This value is required to exchange for the user's real access token and secret.");
  }
  if (!tempSecret) {
    issues.push("The temporary secret from the request_token step (stored in the cookie) is missing. Without it we cannot sign the access_token request in step 3 to get the usable user token + secret.");
  }
  if (state !== expectedState) {
    issues.push(`The state value X sent back in the callback was "${state}", but the expected value (the one we stored in the cookie when we started the flow) was "${expectedState}". This usually means the callback is not from the authorization we initiated.`);
  }

  if (issues.length > 0) {
    const invalid = authEntry('failed', {
      hasOauthToken: Boolean(oauthToken),
      hasVerifier: Boolean(oauthVerifier),
      hasTempSecret: Boolean(tempSecret),
      stateMatch: state === expectedState,
      issues,
      error: 'x_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET', issues, receivedState: state, expectedState }, issues.join(' '));
    flashAuthDebug(cookies, 'x', invalid);
    throw redirect(303, '/?error=x_auth_failed');
  }

  try {
    const consumerKey = mustEnv('X_CONSUMER_KEY');
    const consumerSecret = mustEnv('X_CONSUMER_SECRET');

    // Step 3: POST oauth/access_token (signed with consumer + temp secret + verifier)
    const accessTokenUrl = 'https://api.x.com/oauth/access_token';
    const accessParams = {
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
    };
    const authHeader = buildAuthHeader({
      consumerKey,
      consumerSecret,
      token: oauthToken,
      tokenSecret: tempSecret,
      method: 'POST',
      url: accessTokenUrl,
      extraParams: accessParams,
    });

    const accessRes = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier,
      }),
    });

    if (!accessRes.ok) {
      const text = await accessRes.text();
      throw new Error(`OAuth1 access_token failed: ${accessRes.status} ${text}`);
    }

    const accessText = await accessRes.text();
    const accessParamsParsed = new URLSearchParams(accessText);
    const finalOauthToken = accessParamsParsed.get('oauth_token');
    const finalOauthTokenSecret = accessParamsParsed.get('oauth_token_secret');

    if (!finalOauthToken || !finalOauthTokenSecret) {
      throw new Error('Invalid access_token response from X');
    }

    // Fetch user (use /1.1/verify_credentials as recommended in docs for identity)
    const userUrl = 'https://api.x.com/1.1/account/verify_credentials.json';
    const userAuthHeader = buildAuthHeader({
      consumerKey,
      consumerSecret,
      token: finalOauthToken,
      tokenSecret: finalOauthTokenSecret,
      method: 'GET',
      url: userUrl,
    });

    const userRes = await fetch(`${userUrl}?skip_status=true&include_entities=false`, {
      headers: { Authorization: userAuthHeader },
    });

    if (!userRes.ok) {
      const text = await userRes.text();
      throw new Error(`User lookup failed: ${userRes.status} ${text}`);
    }

    const user = await userRes.json();
    const username = user.screen_name || user.name || user.id_str || 'user';

    const tokenData = {
      oauth_token: finalOauthToken,
      oauth_token_secret: finalOauthTokenSecret,
      username,
    };

    const pathname = tokenPath('x', username);
    const storeLog = stepLog.child({ phase: 'x:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys(tokenData || {}),
      },
      'Starting X token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, tokenData);
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'X token store save succeeded',
    );

    cookies.delete('x_oauth1_temp_secret', { path: '/' });
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