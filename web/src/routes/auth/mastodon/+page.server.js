import { fail, redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { redirectBase } from '$lib/env.js';

export function load({ url }) {
  return { error: url.searchParams.get('error') };
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
    if (!instance) return fail(400, { error: 'Instance required' });

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
      return fail(400, { error: 'Failed to register app with instance', instance });
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

    throw redirect(302, `${instance}/oauth/authorize?${params}`);
  },
};