import { redirect } from '@sveltejs/kit';
import { redirectBase } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'mastodon', functionName: 'mastodon/callback/+server.js:GET' });

export async function GET({ url, cookies }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'mastodon:callback:start' });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    const missingCode = authEntry('failed', { error: 'missing_code' });
    stepLog.error({ type: LOG_TYPE.VALIDATION_ERROR, functionName: 'GET' }, 'Mastodon callback missing code');
    flashAuthDebug(cookies, 'mastodon', missingCode);
    throw redirect(303, '/auth/mastodon?error=missing_code');
  }

  if (state !== cookies.get('mastodon_oauth_state')) {
    const badState = authEntry('failed', { error: 'state' });
    stepLog.error({ type: LOG_TYPE.STATE_MISMATCH, functionName: 'GET' }, 'Mastodon callback invalid state');
    flashAuthDebug(cookies, 'mastodon', badState);
    throw redirect(303, '/auth/mastodon?error=state');
  }

  const instance = cookies.get('mastodon_instance');
  const clientId = cookies.get('mastodon_client_id');
  const clientSecret = cookies.get('mastodon_client_secret');

  try {
    const tokenRes = await fetch(`${instance}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${redirectBase()}/auth/mastodon/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const tokenFailed = authEntry('failed', {
        error: 'token',
        status: tokenRes.status,
        statusText: tokenRes.statusText,
      });
      logAuth('mastodon', 'callback:failed', tokenFailed);
      flashAuthDebug(cookies, 'mastodon', tokenFailed);
      throw redirect(303, '/auth/mastodon?error=token');
    }

    const tokenData = await tokenRes.json();
    tokenData.instance = instance;
    tokenData.obtained_at = new Date().toISOString();

    const verifyRes = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const account = verifyRes.ok ? await verifyRes.json() : {};
    const name = account.username || 'user';

    const pathname = tokenPath('mastodon', `${name}-${new URL(instance).hostname}`);
    const storeLog = stepLog.child({ phase: 'mastodon:store:save', pathname });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname,
        dataKeys: Object.keys(tokenData || {}),
        hasAccessToken: !!tokenData?.access_token,
        instance,
      },
      'Starting Mastodon token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pathname, tokenData);
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'Mastodon token store save succeeded',
    );

    cookies.delete('mastodon_oauth_state', { path: '/' });
    cookies.delete('mastodon_instance', { path: '/' });
    cookies.delete('mastodon_client_id', { path: '/' });
    cookies.delete('mastodon_client_secret', { path: '/' });

    stepLog.info({ functionName: 'GET', phase: 'callback:success', name, instance }, 'Mastodon connect success');
    throw redirect(303, '/?connected=mastodon');
  } catch (err) {
    if (err?.status === 303) throw err;
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      `Mastodon callback failed: ${err.message || 'unknown'}`,
    );
    const failed = authEntry('failed', { error: errInfo });
    flashAuthDebug(cookies, 'mastodon', failed);
    throw redirect(303, '/auth/mastodon?error=token');
  }
}