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

    const actionLog = fnLog.child({ phase: 'bluesky:action' });
    actionLog.info(
      {
        handlePresent: Boolean(handle),
        passwordLength: password.length,
        service,
      },
      'Bluesky login action started',
    );

    if (!handle || !password) {
      actionLog.error({ type: LOG_TYPE.VALIDATION_ERROR }, 'Missing handle or password');
      return fail(400, {
        error: 'Handle and app password are required',
        handle,
        service,
      });
    }

    const loginLog = actionLog.child({ phase: 'bluesky:login' });
    loginLog.info('Starting Bluesky login');

    let agent;
    try {
      agent = new BskyAgent({ service });
      await agent.login({ identifier: handle, password });
      loginLog.info(
        {
          handle: agent.session?.handle,
          did: agent.session?.did,
        },
        'Bluesky login succeeded',
      );
    } catch (err) {
      const errInfo = serializeError(err);
      const errorMessage = err.message || 'Login failed';
      const isAuthError = err.status === 401 || errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('password');
      loginLog[isAuthError ? 'warn' : 'error'](
        {
          type: isAuthError ? 'USER_AUTH_ERROR' : LOG_TYPE.OAUTH_EXCHANGE_ERROR,
          err: errInfo,
          handle,
          service,
          isExpectedUserError: isAuthError,
        },
        `Bluesky login failed: ${errorMessage}`,
      );

      return fail(401, {
        error: errorMessage,
        handle,
        service,
      });
    }

    // Login succeeded, now save to blob
    const tokenData = {
      ...agent.session,
      service,
      connected_at: new Date().toISOString(),
    };

    const pathname = tokenPath('bluesky', agent.session.handle || handle);
    const blobLog = actionLog.child({ phase: 'bluesky:blob:save' });
    blobLog.info({ pathname }, 'Starting Bluesky token Blob save');

    try {
      await saveToken(pathname, tokenData);
      blobLog.info({ pathname }, 'Bluesky token Blob save succeeded');

      return {
        success: true,
        handle: agent.session.handle || handle,
      };
    } catch (err) {
      const errInfo = serializeError(err);
      blobLog.error(
        {
          type: LOG_TYPE.BLOB_ERROR,
          err: errInfo,
          handle,
          service,
          pathname,
        },
        `Bluesky token Blob save failed: ${err.message || 'unknown error'}`,
      );

      // Login succeeded for the user, but blob save failed - still return success so user sees connected,
      // but the token won't be persisted for later sends. This is a system error.
      return {
        success: true,
        handle: agent.session.handle || handle,
        warning: 'Login succeeded but failed to save token. Check server logs.',
      };
    }
  },
};