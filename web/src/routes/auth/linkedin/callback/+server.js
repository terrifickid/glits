import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'linkedin', functionName: 'linkedin/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'linkedin:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stored = cookies.get('linkedin_oauth_state');

  if (!code || state !== stored) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === stored,
      error: 'linkedin_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'LinkedIn callback invalid state/code');
    flashAuthDebug(cookies, 'linkedin', invalid);
    throw redirect(303, '/?error=linkedin_auth_failed');
  }

  try {
    stepLog.info({ functionName: 'GET', phase: 'exchange:start' }, 'Starting LinkedIn exchangeCode');
    const tokenData = await exchangeCode({
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      body: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${redirectBase()}/auth/linkedin/callback`,
        client_id: mustEnv('LINKEDIN_CLIENT_ID'),
        client_secret: mustEnv('LINKEDIN_CLIENT_SECRET'),
      },
    });

    stepLog.info({ functionName: 'GET', phase: 'user:fetch:start' }, 'Fetching LinkedIn userinfo');
    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    const account = user.preferred_username || user.name || user.sub;
    tokenData.author_urn = `urn:li:person:${user.sub}`;

    const pathname = tokenPath('linkedin', account);
    const storeLog = stepLog.child({ phase: 'linkedin:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys(tokenData || {}),
        hasAccessToken: !!tokenData?.access_token,
        hasRefresh: !!tokenData?.refresh_token,
      },
      'Starting LinkedIn token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, tokenData);
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'LinkedIn token store save succeeded',
    );
    cookies.delete('linkedin_oauth_state', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', account }, 'LinkedIn connect complete');
    throw redirect(303, '/?connected=linkedin');
  } catch (err) {
    if (err?.status === 303) throw err;
    const errInfo = serializeError(err, 'GET');
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      'LinkedIn callback failed',
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'linkedin', failed);
    throw redirect(303, '/?error=linkedin_auth_failed');
  }
}