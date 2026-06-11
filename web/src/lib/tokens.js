import { log } from '$lib/logger.js';

const fnLog = log.child({ functionName: 'tokenPath' });

export function tokenPath(platform, account) {
  fnLog.debug({ phase: 'token:path:generate', platform }, 'Generating token pathname');
  const safe = account.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `tokens/${safe}-${platform}.json`;
  fnLog.debug({ phase: 'token:path:generated', path }, 'Token pathname generated');
  return path;
}