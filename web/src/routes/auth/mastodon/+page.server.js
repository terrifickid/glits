import { fail, redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { redirectBase } from '$lib/env.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export function load({ url }) {
  const error = url.searchParams.get('error');
  if (error) logAuth('mastodon', 'callback:error', authEntry('failed', { error, source: 'query' }));
  return { error };
}

function normalizeInstance(input) {
  let instance = input.trim().replace(/\/$/, '');
  if (!instance.startsWith('http')) instance = `https://${instance}`;
  return instance;
}

export const actions = {
  start: async ({ request, cookies }) => {
    const form = await request.formData();
    const instance = normalizeInstance(String(form.get('instance') || ''));
    const verbose = [authEntry('request', { instance, hasInstance: Boolean(instance) })];
    logAuth('mastodon', 'request', verbose[0]);

    if (!instance) {
      return fail(400, { error: 'Instance required', instance, verbose });
    }

    try {
      const appRes = await fetch(`${instance}/api/v1/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'glits',
          redirect_uris: `${redirectBase()}/auth/mastodon/callback`,
          scopes: 'read write',
          website: redirectBase(),
        }),
      });

      if (!appRes.ok) {
        const failed = authEntry('failed', {
          instance,
          status: appRes.status,
          statusText: appRes.statusText,
          error: 'Failed to register app with instance',
        });
        verbose.push(failed);
        logAuth('mastodon', 'failed', failed);
        return fail(400, { error: 'Failed to register app with instance', instance, verbose });
      }

      const app = await appRes.json();
      const state = randomState();

      cookies.set('mastodon_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
      cookies.set('mastodon_instance', instance, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
      cookies.set('mastodon_client_id', app.client_id, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
      cookies.set('mastodon_client_secret', app.client_secret, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

      const params = new URLSearchParams({
        client_id: app.client_id,
        redirect_uri: `${redirectBase()}/auth/mastodon/callback`,
        response_type: 'code',
        scope: 'read write',
        state,
      });

      const redirectEntry = authEntry('oauth:redirect', { instance, state });
      verbose.push(redirectEntry);
      logAuth('mastodon', 'oauth:redirect', redirectEntry);

      throw redirect(302, `${instance}/oauth/authorize?${params}`);
    } catch (err) {
      if (err?.status === 302 || err?.status === 303) throw err;

      const failed = authEntry('failed', {
        instance,
        error: serializeError(err),
      });
      verbose.push(failed);
      logAuth('mastodon', 'failed', failed);
      return fail(500, { error: err.message || 'Authorization failed', instance, verbose });
    }
  },
};