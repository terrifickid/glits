import { fail } from '@sveltejs/kit';
import { BskyAgent } from '@atproto/api';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, serializeError, authEntry } from '$lib/logger.js';

const fnLog = log.child({ provider: 'bluesky', functionName: 'bluesky/+page.server.js:default' });

export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const handle = String(form.get('handle') || '').trim();
    const password = String(form.get('password') || '').trim();
    const service = String(form.get('service') || 'https://bsky.social').trim() || 'https://bsky.social';

    const stepLog = fnLog.child({ phase: 'bluesky:action:start' });
    stepLog.info(
      {
        functionName: 'default',
        handlePresent: Boolean(handle),
        passwordLength: password.length,
        service,
      },
      'Bluesky login action started',
    );

    if (!handle || !password) {
      stepLog.error({ type: LOG_TYPE.VALIDATION_ERROR, functionName: 'default' }, 'Missing handle or password');
      return fail(400, {
        error: 'Handle and app password are required',
        handle,
        service,
      });
    }

    try {
      const agent = new BskyAgent({ service });
      stepLog.info({ functionName: 'default', phase: 'bluesky:login:start' }, 'Starting Bluesky login');

      const loginResult = await agent.login({ identifier: handle, password });
      stepLog.info(
        {
          functionName: 'default',
          phase: 'bluesky:login:success',
          handle: agent.session?.handle,
          did: agent.session?.did,
        },
        'Bluesky login succeeded',
      );

      const tokenData = {
        ...agent.session,
        service,
        connected_at: new Date().toISOString(),
      };

      const pathname = tokenPath('bluesky', agent.session.handle || handle);
      stepLog.info({ functionName: 'default', phase: 'bluesky:blob:save:start', pathname }, 'Starting Bluesky token Blob save');

      await saveToken(pathname, tokenData);
      stepLog.info({ functionName: 'default', phase: 'bluesky:blob:save:success', pathname }, 'Bluesky token Blob save succeeded');

      return {
        success: true,
        handle: agent.session.handle || handle,
      };
    } catch (err) {
      const errInfo = serializeError(err, 'default');
      stepLog.error(
        {
          type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
          functionName: 'default',
          err: errInfo,
          handle,
          service,
        },
        'Bluesky login or blob save failed',
      );

      return fail(401, {
        error: err.message || 'Login failed',
        handle,
        service,
      });
    }
  },
};