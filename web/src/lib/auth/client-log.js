import { log, LOG_TYPE } from '$lib/logger.js';

const ERROR_CODES = {
  x_auth_failed: 'x',
  youtube_auth_failed: 'youtube',
  linkedin_auth_failed: 'linkedin',
  instagram_auth_failed: 'instagram',
  facebook_auth_failed: 'facebook',
  threads_auth_failed: 'threads',
};

export function logServerResponse(provider, response) {
  const stepLog = log.child({ provider, functionName: 'logServerResponse' });
  stepLog.info({ phase: 'client:serverResponse', ...response }, `[glits/${provider}] serverResponse`);
}

export function logAuthClient(provider, entry) {
  if (!entry) return;
  const phase = entry.phase || 'log';
  const stepLog = log.child({ provider, functionName: 'logAuthClient' });
  stepLog.info({ phase: `client:${phase}`, ...entry }, `[glits/${provider}] ${phase}`);
}

export function logAuthClientVerbose(provider, verbose) {
  if (!verbose) return;
  for (const entry of verbose) logAuthClient(provider, entry);
}

export function logAuthQueryError(provider, error, extra = {}) {
  if (!error) return;
  const stepLog = log.child({ provider, functionName: 'logAuthQueryError' });
  stepLog.error(
    {
      type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
      functionName: 'logAuthQueryError',
      phase: 'client:failed',
      error,
      ...extra,
    },
    `[glits/${provider}] query error`,
  );
}

export function logAuthQuerySuccess(provider, extra = {}) {
  const stepLog = log.child({ provider, functionName: 'logAuthQuerySuccess' });
  stepLog.info({ phase: 'client:success', ...extra }, `[glits/${provider}] query success`);
}

export function authFormEnhance(provider) {
  return () => async ({ result, update }) => {
    const stepLog = log.child({ provider, functionName: 'authFormEnhance' });
    if (result.type === 'success' || result.type === 'failure') {
      stepLog.info({ phase: 'client:form:result', resultType: result.type }, 'Form result');
      logServerResponse(provider, result.data);
      logAuthClientVerbose(provider, result.data?.verbose);
    } else if (result.type === 'error') {
      stepLog.error({ phase: 'client:form:error' }, 'Form error');
      logServerResponse(provider, { error: result.error, status: result.status });
    } else {
      logServerResponse(provider, result);
    }
    await update();
  };
}

export function logHomeAuthQuery(connected, error, authDebug) {
  const stepLog = log.child({ functionName: 'logHomeAuthQuery' });
  if (authDebug) logServerResponse(authDebug.provider || 'auth', authDebug);
  if (connected) logAuthQuerySuccess(connected);
  if (error) {
    const mapped = ERROR_CODES[error] || 'auth';
    stepLog.error({ phase: 'client:home:error' }, 'Home auth error');
    logAuthQueryError(mapped, error);
  }
}

export function logPageAuthErrors(provider, page = {}) {
  const stepLog = log.child({ provider, functionName: 'logPageAuthErrors' });
  const { data, form } = page;
  if (data?.authDebug) logServerResponse(provider, data.authDebug);
  if (form) logServerResponse(provider, form);
  if (data?.error && !form?.error) {
    stepLog.error({ phase: 'client:page:error' }, 'Page auth error');
    logAuthQueryError(provider, data.error, { source: 'query' });
  }
}