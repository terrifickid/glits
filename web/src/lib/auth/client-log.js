const ERROR_CODES = {
  x_auth_failed: 'x',
  youtube_auth_failed: 'youtube',
  linkedin_auth_failed: 'linkedin',
  instagram_auth_failed: 'instagram',
  facebook_auth_failed: 'facebook',
  threads_auth_failed: 'threads',
};

export function logAuthClient(provider, entry) {
  if (!entry) return;
  const phase = entry.phase || 'log';
  const msg = `[glits/${provider}] ${phase}`;
  if (phase === 'failed' || entry.error) {
    console.error(msg, entry);
  } else {
    console.log(msg, entry);
  }
}

export function logAuthClientVerbose(provider, verbose) {
  if (!verbose) return;
  for (const entry of verbose) logAuthClient(provider, entry);
}

export function logAuthQueryError(provider, error, extra = {}) {
  if (!error) return;
  logAuthClient(provider, { phase: 'failed', error, ...extra });
}

export function logAuthQuerySuccess(provider, extra = {}) {
  logAuthClient(provider, { phase: 'success', ...extra });
}

export function authFormEnhance(provider) {
  return async ({ result, update }) => {
    if (result.type === 'success' || result.type === 'failure') {
      logAuthClientVerbose(provider, result.data?.verbose);
      if (result.type === 'failure' && result.data?.error && !result.data?.verbose?.length) {
        logAuthQueryError(provider, result.data.error);
      }
    }
    await update();
  };
}

export function logHomeAuthQuery(connected, error) {
  if (connected) logAuthQuerySuccess(connected);
  if (error) {
    const provider = ERROR_CODES[error] || 'auth';
    logAuthQueryError(provider, error);
  }
}

export function logPageAuthErrors(provider, { data, form } = {}) {
  if (data?.error) logAuthQueryError(provider, data.error, { source: 'query' });
  if (form?.error) {
    logAuthClientVerbose(provider, form.verbose);
    if (!form.verbose?.length) logAuthQueryError(provider, form.error, { source: 'form' });
  }
}