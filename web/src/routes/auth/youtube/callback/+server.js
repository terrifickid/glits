import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, flashAuthDebug, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('google_oauth_state')) {
    const invalid = authEntry('failed', {
      hasCode: Boolean(code),
      stateMatch: state === cookies.get('google_oauth_state'),
      error: 'youtube_auth_failed',
    });
    logAuth('youtube', 'callback:invalid', invalid);
    flashAuthDebug(cookies, 'youtube', invalid);
    throw redirect(303, '/?error=youtube_auth_failed');
  }

  try {
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

    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const channel = await channelRes.json();
    const account = channel.items?.[0]?.snippet?.title || 'channel';

    // Validate blob connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(tokenPath('youtube', account), tokenData);
    cookies.delete('google_oauth_state', { path: '/' });

    logAuth('youtube', 'callback:success', authEntry('success', { account }));
    throw redirect(303, '/?connected=youtube');
  } catch (err) {
    if (err?.status === 303) throw err;
    const failed = authEntry('failed', { error: serializeError(err) });
    logAuth('youtube', 'callback:failed', failed);
    flashAuthDebug(cookies, 'youtube', failed);
    throw redirect(303, '/?error=youtube_auth_failed');
  }
}