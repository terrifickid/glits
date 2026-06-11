import { redirect } from '@sveltejs/kit';
import { exchangeMetaCode, getThreadsUserId } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'threads', functionName: 'threads/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'threads:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('meta_oauth_state_threads')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('meta_oauth_state_threads'),
      error: 'threads_auth_failed',
    });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'Threads callback invalid state/code');
    flashAuthDebug(cookies, 'threads', invalid);
    throw redirect(303, '/?error=threads_auth_failed');
  }

  try {
    stepLog.info({ functionName: 'GET', phase: 'exchange:start' }, 'Starting Threads Meta exchange');
    const tokenData = await exchangeMetaCode({
      appId: mustEnv('META_APP_ID'),
      appSecret: mustEnv('META_APP_SECRET'),
      redirectUri: `${redirectBase()}/auth/threads/callback`,
      code,
    });

    stepLog.info({ functionName: 'GET', phase: 'user:fetch:start' }, 'Fetching Threads user ID');
    const threadsUser = await getThreadsUserId(tokenData.access_token);
    const account = threadsUser.username || threadsUser.threads_user_id;

    const pathname = tokenPath('threads', account);
    const storeLog = stepLog.child({ phase: 'threads:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys({ ...tokenData, ...threadsUser } || {}),
        hasAccessToken: !!tokenData?.access_token,
      },
      'Starting Threads token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, { ...tokenData, ...threadsUser });
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'Threads token store save succeeded',
    );

    cookies.delete('meta_oauth_state_threads', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', account }, 'Threads connect success');
    throw redirect(303, '/?connected=threads');
  } catch (err) {
    if (err?.status === 303) throw err;
    const serverError = err.message || 'Threads callback failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      `Threads callback failed: ${serverError}`,
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'threads', failed);
    throw redirect(303, '/?error=threads_auth_failed');
  }
}