import { log, LOG_TYPE, serializeError as newSerializeError } from '$lib/logger.js';

export function serializeError(err) {
  // Delegate to new for full functionName support etc.
  return newSerializeError(err);
}

export function logAuth(provider, phase, payload) {
  // Use new structured logger for server diagnostic output
  const stepLog = log.child({ provider, functionName: 'logAuth', phase });
  if (payload?.error || phase.includes('failed') || phase.includes('error')) {
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'logAuth',
        phase,
        ...payload,
      },
      `[glits/${provider}] ${phase}`,
    );
  } else {
    stepLog.info(
      {
        functionName: 'logAuth',
        phase,
        ...payload,
      },
      `[glits/${provider}] ${phase}`,
    );
  }
}

export function authEntry(phase, data = {}) {
  return { phase, ...data };
}

export function flashAuthDebug(cookies, provider, payload) {
  try {
    cookies.set(
      'glits_auth_debug',
      JSON.stringify({ provider, ...payload }),
      { path: '/', httpOnly: true, maxAge: 120, sameSite: 'lax' },
    );
  } catch {
    // ignore oversized payloads
  }
}