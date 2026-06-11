import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, flashAuthDebug, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('linkedin_oauth_state')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('linkedin_oauth_state'),
      error: 'linkedin_auth_failed',
    });
    logAuth('linkedin', 'callback:invalid', invalid);
    flashAuthDebug(cookies, 'linkedin', invalid);
    throw redirect(303, '/?error=linkedin_auth_failed');
  }

  try {
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

    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    const account = user.preferred_username || user.name || user.sub;
    tokenData.author_urn = `urn:li:person:${user.sub}`;

    await saveToken(tokenPath('linkedin', account), tokenData);
    cookies.delete('linkedin_oauth_state', { path: '/' });

    logAuth('linkedin', 'callback:success', authEntry('success', { account }));
    throw redirect(303, '/?connected=linkedin');
  } catch (err) {
    if (err?.status === 303) throw err;
    const failed = authEntry('failed', { error: serializeError(err) });
    logAuth('linkedin', 'callback:failed', failed);
    flashAuthDebug(cookies, 'linkedin', failed);
    throw redirect(303, '/?error=linkedin_auth_failed');
  }
}