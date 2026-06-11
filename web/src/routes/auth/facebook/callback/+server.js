import { redirect } from '@sveltejs/kit';
import { exchangeMetaCode, getFacebookPage } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'facebook', functionName: 'facebook/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'facebook:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('meta_oauth_state_facebook')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('meta_oauth_state_facebook'),
      error: 'facebook_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'Facebook callback invalid state/code');
    flashAuthDebug(cookies, 'facebook', invalid);
    throw redirect(303, '/?error=facebook_auth_failed');
  }

  try {
    stepLog.info({ functionName: 'GET', phase: 'exchange:start' }, 'Starting Facebook Meta exchange');
    const tokenData = await exchangeMetaCode({
      appId: mustEnv('META_APP_ID'),
      appSecret: mustEnv('META_APP_SECRET'),
      redirectUri: `${redirectBase()}/auth/facebook/callback`,
      code,
    });

    stepLog.info({ functionName: 'GET', phase: 'user:fetch:start' }, 'Fetching Facebook page');
    const page = await getFacebookPage(tokenData.access_token);
    const account = page.page_name || page.page_id;

    const pathname = tokenPath('facebook', account);
    const storeLog = stepLog.child({ phase: 'facebook:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys({ ...tokenData, ...page } || {}),
        hasAccessToken: !!tokenData?.access_token,
      },
      'Starting Facebook token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, { ...tokenData, ...page });
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'Facebook token store save succeeded',
    );

    cookies.delete('meta_oauth_state_facebook', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', account }, 'Facebook connect success');
    throw redirect(303, '/?connected=facebook');
  } catch (err) {
    if (err?.status === 303) throw err;
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      `Facebook callback failed: ${err.message || 'unknown'}`,
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'facebook', failed);
    throw redirect(303, '/?error=facebook_auth_failed');
  }
}