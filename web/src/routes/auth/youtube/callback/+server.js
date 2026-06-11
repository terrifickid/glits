import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'youtube', functionName: 'youtube/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'youtube:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('google_oauth_state')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('google_oauth_state'),
      error: 'youtube_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'YouTube callback invalid state/code');
    flashAuthDebug(cookies, 'youtube', invalid);
    throw redirect(303, '/?error=youtube_auth_failed');
  }

  try {
    stepLog.info({ functionName: 'GET', phase: 'exchange:start' }, 'Starting YouTube token exchange');
    const tokenData = await exchangeCode({
      tokenUrl: 'https://oauth2.googleapis.com/token',
      body: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${redirectBase()}/auth/youtube/callback`,
        client_id: mustEnv('GOOGLE_CLIENT_ID'),
        client_secret: mustEnv('GOOGLE_CLIENT_SECRET'),
      },
    });

    stepLog.info({ functionName: 'GET', phase: 'user:fetch:start' }, 'Fetching YouTube channel');
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const channel = await channelRes.json();
    const account = channel.items?.[0]?.snippet?.title || 'channel';

    const pathname = tokenPath('youtube', account);
    const storeLog = stepLog.child({ phase: 'youtube:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys(tokenData || {}),
        hasAccessToken: !!tokenData?.access_token,
      },
      'Starting YouTube token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, tokenData);
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'YouTube token store save succeeded',
    );
    cookies.delete('google_oauth_state', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', account }, 'YouTube connect success');
    throw redirect(303, '/?connected=youtube');
  } catch (err) {
    if (err?.status === 303) throw err;
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      `YouTube callback failed: ${err.message || 'unknown'}`,
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'youtube', failed);
    throw redirect(303, '/?error=youtube_auth_failed');
  }
}