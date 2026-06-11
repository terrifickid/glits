import { fail, redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { redirectBase } from '$lib/env.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';
import { readAuthDebug } from '$lib/auth/load-debug.js';
import { flashAuthDebug } from '$lib/auth/verbose.js';

const fnLog = log.child({ provider: 'mastodon', functionName: 'mastodon/+page.server.js' });

export function load({ url, cookies }) {
  const error = url.searchParams.get('error');
  if (error) {
    const stepLog = fnLog.child({ functionName: 'load' });
    stepLog.error({ type: LOG_TYPE.OAUTH_EXCHANGE_ERROR }, `Mastodon callback error from query: ${error}`);
  }
  return { error, authDebug: readAuthDebug(cookies) };
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
    const stepLog = fnLog.child({ functionName: 'start', phase: 'mastodon:start' });
    stepLog.info({ instancePresent: Boolean(instance) }, 'Mastodon start action');

    if (!instance) {
      stepLog.error({ type: LOG_TYPE.VALIDATION_ERROR }, 'Instance required');
      return fail(400, { error: 'Instance required', instance });
    }

    try {
      stepLog.info({ phase: 'mastodon:app:register:start' }, 'Registering app with Mastodon instance');
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
        const serverError = `Failed to register app with instance (status ${appRes.status})`;
        stepLog.error(
          {
            type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
            status: appRes.status,
          },
          `Mastodon app registration failed: ${serverError}`,
        );
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

      stepLog.info({ phase: 'oauth:redirect', instance, state }, 'Mastodon OAuth redirect initiated');
      throw redirect(302, `${instance}/oauth/authorize?${params}`);
    } catch (err) {
      if (err?.status === 302 || err?.status === 303) throw err;

      const serverError = err.message || 'Authorization failed';
      const errInfo = serializeError(err);
      stepLog.error(
        {
          type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
          err: errInfo,
          instance,
        },
        `Mastodon authorization failed: ${serverError}`,
      );
      return fail(500, { error: serverError, instance });
    }
  },
};