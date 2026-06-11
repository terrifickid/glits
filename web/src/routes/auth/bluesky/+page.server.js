import { fail } from '@sveltejs/kit';
import { BskyAgent } from '@atproto/api';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const handle = String(form.get('handle') || '').trim();
    const password = String(form.get('password') || '').trim();
    const service = String(form.get('service') || 'https://bsky.social').trim() || 'https://bsky.social';

    const verbose = [
      authEntry('request', {
        handle,
        service,
        passwordLength: password.length,
        hasHandle: Boolean(handle),
        hasPassword: Boolean(password),
      }),
    ];
    logAuth('bluesky', 'request', verbose[0]);

    if (!handle || !password) {
      return fail(400, {
        error: 'Handle and app password are required',
        handle,
        service,
        verbose,
      });
    }

    try {
      const agent = new BskyAgent({ service });
      const loginStart = authEntry('login:start', { handle, service });
      verbose.push(loginStart);
      logAuth('bluesky', 'login:start', loginStart);

      const loginResult = await agent.login({ identifier: handle, password });
      const loginSuccess = authEntry('login:success', {
        handle: agent.session?.handle,
        did: agent.session?.did,
        loginResult,
        sessionKeys: agent.session ? Object.keys(agent.session) : [],
      });
      verbose.push(loginSuccess);
      logAuth('bluesky', 'login:success', loginSuccess);

      const tokenData = {
        ...agent.session,
        service,
        connected_at: new Date().toISOString(),
      };

      const pathname = tokenPath('bluesky', agent.session.handle || handle);
      const blobStart = authEntry('blob:save:start', { pathname });
      verbose.push(blobStart);
      logAuth('bluesky', 'blob:save:start', blobStart);

      await saveToken(pathname, tokenData);
      const blobSuccess = authEntry('blob:save:success', { pathname });
      verbose.push(blobSuccess);
      logAuth('bluesky', 'blob:save:success', blobSuccess);

      return {
        success: true,
        handle: agent.session.handle || handle,
        verbose,
      };
    } catch (err) {
      const failed = authEntry('failed', {
        handle,
        service,
        passwordLength: password.length,
        error: serializeError(err),
      });
      verbose.push(failed);
      logAuth('bluesky', 'failed', failed);

      return fail(401, {
        error: err.message || 'Login failed',
        handle,
        service,
        verbose,
      });
    }
  },
};