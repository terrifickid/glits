import { redirect } from '@sveltejs/kit';
import { exchangeMetaCode, getFacebookPage } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('meta_oauth_state_facebook')) {
    logAuth('facebook', 'callback:invalid', authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('meta_oauth_state_facebook'),
      error: 'facebook_auth_failed',
    }));
    throw redirect(303, '/?error=facebook_auth_failed');
  }

  try {
    const tokenData = await exchangeMetaCode({
      appId: mustEnv('META_APP_ID'),
      appSecret: mustEnv('META_APP_SECRET'),
      redirectUri: `${redirectBase()}/auth/facebook/callback`,
      code,
    });

    const page = await getFacebookPage(tokenData.access_token);
    const account = page.page_name || page.page_id;
    await saveToken(tokenPath('facebook', account), { ...tokenData, ...page });

    cookies.delete('meta_oauth_state_facebook', { path: '/' });

    logAuth('facebook', 'callback:success', authEntry('success', { account }));
    throw redirect(303, '/?connected=facebook');
  } catch (err) {
    if (err?.status === 303) throw err;
    logAuth('facebook', 'callback:failed', authEntry('failed', { error: serializeError(err) }));
    throw redirect(303, '/?error=facebook_auth_failed');
  }
}