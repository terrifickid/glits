import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== cookies.get('google_oauth_state')) {
    throw redirect(303, '/?error=youtube_auth_failed');
  }

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

  await saveToken(tokenPath('youtube', account), tokenData);
  cookies.delete('google_oauth_state', { path: '/' });
  throw redirect(303, '/?connected=youtube');
}