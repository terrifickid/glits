const ERROR_CODES = {
  x_auth_failed: 'x',
  youtube_auth_failed: 'youtube',
  linkedin_auth_failed: 'linkedin',
  instagram_auth_failed: 'instagram',
  facebook_auth_failed: 'facebook',
  threads_auth_failed: 'threads',
};

export function logServerResponse(provider, response) {
  console.log(`[glits/${provider}] serverResponse`, response);
}

export function logAuthClient(provider, entry) {
  if (!entry) return;
  const phase = entry.phase || 'log';
  console.log(`[glits/${provider}] ${phase}`, entry);
}

export function logAuthClientVerbose(provider, verbose) {
  if (!verbose) return;
  for (const entry of verbose) logAuthClient(provider, entry);
}

export function logAuthQueryError(provider, error, extra = {}) {
  if (!error) return;
  logServerResponse(provider, { phase: 'failed', error, ...extra });
}

export function logAuthQuerySuccess(provider, extra = {}) {
  logServerResponse(provider, { phase: 'success', ...extra });
}

export function authFormEnhance(provider) {
  return () => async ({ result, update }) => {
    if (result.type === 'success' || result.type === 'failure') {
      logServerResponse(provider, result.data);
      logAuthClientVerbose(provider, result.data?.verbose);
    } else if (result.type === 'error') {
      logServerResponse(provider, { error: result.error, status: result.status });
    } else {
      logServerResponse(provider, result);
    }
    await update();
  };
}

export function logHomeAuthQuery(connected, error, authDebug) {
  if (authDebug) logServerResponse(authDebug.provider || 'auth', authDebug);
  if (connected) logAuthQuerySuccess(connected);
  if (error) {
    const mapped = ERROR_CODES[error] || 'auth';
    logAuthQueryError(mapped, error);
  }
}

export function logPageAuthErrors(provider, page = {}) {
  const { data, form } = page;
  if (data?.authDebug) logServerResponse(provider, data.authDebug);
  if (form) logServerResponse(provider, form);
  if (data?.error && !form?.error) logAuthQueryError(provider, data.error, { source: 'query' });
}