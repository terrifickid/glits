import { redirect } from '@sveltejs/kit';
import { exchangeMetaCode, getInstagramUserId } from '$lib/auth/meta.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('meta_oauth_state_instagram')) {
    throw redirect(303, '/?error=instagram_auth_failed');
  }

  const tokenData = await exchangeMetaCode({
    appId: mustEnv('META_APP_ID'),
    appSecret: mustEnv('META_APP_SECRET'),
    redirectUri: `${redirectBase()}/auth/instagram/callback`,
    code,
  });

  const ig = await getInstagramUserId(tokenData.access_token);
  const account = ig.page_name || ig.ig_user_id;
  await saveToken(tokenPath('instagram', account), { ...tokenData, ...ig });

  cookies.delete('meta_oauth_state_instagram', { path: '/' });
  throw redirect(303, '/?connected=instagram');
}