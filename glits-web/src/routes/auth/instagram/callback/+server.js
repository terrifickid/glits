import { redirect } from '@sveltejs/kit';
import { exchangeMetaCode, getInstagramUserId } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'instagram', functionName: 'instagram/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'instagram:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('meta_oauth_state_instagram')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('meta_oauth_state_instagram'),
      error: 'instagram_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'Instagram callback invalid state/code');
    flashAuthDebug(cookies, 'instagram', invalid);
    throw redirect(303, '/?error=instagram_auth_failed');
  }

  try {
    stepLog.info({ functionName: 'GET', phase: 'exchange:start' }, 'Starting Instagram Meta exchange');
    const tokenData = await exchangeMetaCode({
      appId: mustEnv('META_APP_ID'),
      appSecret: mustEnv('META_APP_SECRET'),
      redirectUri: `${redirectBase()}/auth/instagram/callback`,
      code,
    });

    stepLog.info({ functionName: 'GET', phase: 'user:fetch:start' }, 'Fetching Instagram user ID');
    const ig = await getInstagramUserId(tokenData.access_token);
    const account = ig.page_name || ig.ig_user_id;

    const pathname = tokenPath('instagram', account);
    const storeLog = stepLog.child({ phase: 'instagram:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys({ ...tokenData, ...ig } || {}),
        hasAccessToken: !!tokenData?.access_token,
      },
      'Starting Instagram token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, { ...tokenData, ...ig });
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'Instagram token store save succeeded',
    );

    cookies.delete('meta_oauth_state_instagram', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', account }, 'Instagram connect success');
    throw redirect(303, '/?connected=instagram');
  } catch (err) {
    if (err?.status === 303) throw err;
    const serverError = err.message || 'Instagram callback failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      `Instagram callback failed: ${serverError}`,
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'instagram', failed);
    throw redirect(303, '/?error=instagram_auth_failed');
  }
}