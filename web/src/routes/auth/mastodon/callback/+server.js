import { redirect } from '@sveltejs/kit';
import { redirectBase } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    logAuth('mastodon', 'callback:invalid', authEntry('failed', { error: 'missing_code' }));
    throw redirect(303, '/auth/mastodon?error=missing_code');
  }

  if (state !== cookies.get('mastodon_oauth_state')) {
    logAuth('mastodon', 'callback:invalid', authEntry('failed', { error: 'state' }));
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
      logAuth('mastodon', 'callback:failed', authEntry('failed', {
        error: 'token',
        status: tokenRes.status,
        statusText: tokenRes.statusText,
      }));
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

    await saveToken(tokenPath('mastodon', `${name}-${new URL(instance).hostname}`), tokenData);

    cookies.delete('mastodon_oauth_state', { path: '/' });
    cookies.delete('mastodon_instance', { path: '/' });
    cookies.delete('mastodon_client_id', { path: '/' });
    cookies.delete('mastodon_client_secret', { path: '/' });

    logAuth('mastodon', 'callback:success', authEntry('success', { name, instance }));
    throw redirect(303, '/?connected=mastodon');
  } catch (err) {
    if (err?.status === 303) throw err;
    logAuth('mastodon', 'callback:failed', authEntry('failed', { error: serializeError(err) }));
    throw redirect(303, '/auth/mastodon?error=token');
  }
}