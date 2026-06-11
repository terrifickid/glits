import { fail } from '@sveltejs/kit';
import { BskyAgent } from '@atproto/api';
import { saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';

export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const handle = String(form.get('handle') || '').trim();
    const password = String(form.get('password') || '').trim();
    const service = String(form.get('service') || 'https://bsky.social').trim() || 'https://bsky.social';

    if (!handle || !password) {
      return fail(400, { error: 'Handle and app password are required', handle, service });
    }

    try {
      const agent = new BskyAgent({ service });
      await agent.login({ identifier: handle, password });

      const tokenData = {
        ...agent.session,
        service,
        connected_at: new Date().toISOString(),
      };

      const pathname = tokenPath('bluesky', agent.session.handle || handle);
      await saveToken(pathname, tokenData);

      return {
        success: true,
        handle: agent.session.handle || handle,
      };
    } catch (err) {
      return fail(401, {
        error: err.message || 'Login failed',
        handle,
        service,
      });
    }
  },
};