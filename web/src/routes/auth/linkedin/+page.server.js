import { redirect } from '@sveltejs/kit';
import { randomState } from '$lib/oauth.js';
import { redirectBase, mustEnv } from '$lib/env.js';
import { log, LOG_TYPE, authEntry } from '$lib/logger.js';

const fnLog = log.child({ provider: 'linkedin', functionName: 'linkedin/+page.server.js:load' });

export function load({ cookies }) {
  const stepLog = fnLog.child({ functionName: 'load', phase: 'linkedin:load:start' });
  const state = randomState();
  cookies.set('linkedin_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: mustEnv('LINKEDIN_CLIENT_ID'),
    redirect_uri: `${redirectBase()}/auth/linkedin/callback`,
    scope: 'openid profile w_member_social',
    state,
  });

  stepLog.info({ functionName: 'load', phase: 'oauth:redirect', state }, 'LinkedIn OAuth redirect initiated');
  throw redirect(302, `https://www.linkedin.com/oauth/v2/authorization?${params}`);
}