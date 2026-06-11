import { redirect } from '@sveltejs/kit';
import { exchangeMetaCode, getThreadsUserId } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, flashAuthDebug, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('meta_oauth_state_threads')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('meta_oauth_state_threads'),
      error: 'threads_auth_failed',
    });
    logAuth('threads', 'callback:invalid', invalid);
    flashAuthDebug(cookies, 'threads', invalid);
    throw redirect(303, '/?error=threads_auth_failed');
  }

  try {
    const tokenData = await exchangeMetaCode({
      appId: mustEnv('META_APP_ID'),
      appSecret: mustEnv('META_APP_SECRET'),
      redirectUri: `${redirectBase()}/auth/threads/callback`,
      code,
    });

    const threads = await getThreadsUserId(tokenData.access_token);
    const account = threads.username || threads.threads_user_id;
    await saveToken(tokenPath('threads', account), { ...tokenData, ...threads });

    cookies.delete('meta_oauth_state_threads', { path: '/' });

    logAuth('threads', 'callback:success', authEntry('success', { account }));
    throw redirect(303, '/?connected=threads');
  } catch (err) {
    if (err?.status === 303) throw err;
    const failed = authEntry('failed', { error: serializeError(err) });
    logAuth('threads', 'callback:failed', failed);
    flashAuthDebug(cookies, 'threads', failed);
    throw redirect(303, '/?error=threads_auth_failed');
  }
}