import crypto from 'node:crypto';
import { log, LOG_TYPE, serializeError } from '$lib/logger.js';

const pkceLog = log.child({ functionName: 'pkce' });
export function pkce() {
  pkceLog.debug({ phase: 'pkce:generate' }, 'Generating PKCE verifier and challenge');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

const stateLog = log.child({ functionName: 'randomState' });
export function randomState() {
  stateLog.debug({ phase: 'oauth:state:generate' }, 'Generating OAuth state');
  return crypto.randomBytes(16).toString('hex');
}

const exchangeLog = log.child({ functionName: 'exchangeCode' });
export async function exchangeCode({
  tokenUrl,
  body,
  headers = { 'Content-Type': 'application/x-www-form-urlencoded' },
}) {
  const stepLog = exchangeLog.child({ phase: 'exchange:request', tokenUrl });
  stepLog.info({ bodyKeys: Object.keys(body || {}), hasCode: !!body?.code }, 'Starting OAuth token exchange');

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: new URLSearchParams(body),
    });
    const data = await res.json();

    if (!res.ok) {
      const serverError = data.error_description || data.error || res.statusText;
      const errInfo = serializeError(
        { message: serverError, status: res.status, data },
      );
      stepLog.error(
        {
          type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
          functionName: 'exchangeCode',
          err: errInfo,
          tokenUrl,
        },
        `OAuth token exchange failed: ${serverError}`,
      );
      throw new Error(serverError);
    }

    const enriched = {
      ...data,
      obtained_at: new Date().toISOString(),
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
    };
    stepLog.info(
      { phase: 'exchange:response:success', hasAccessToken: !!enriched.access_token, hasRefresh: !!enriched.refresh_token },
      'OAuth token exchange succeeded',
    );
    return enriched;
  } catch (err) {
    const serverError = err.message || 'unknown exchange error';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'exchangeCode',
        err: errInfo,
        tokenUrl,
      },
      `OAuth token exchange error: ${serverError}`,
    );
    throw err;
  }
}

const fetchLog = log.child({ functionName: 'fetchJson' });
export async function fetchJson(url, options = {}) {
  const stepLog = fetchLog.child({ phase: 'fetch:start', url });
  stepLog.debug('Starting fetchJson');

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      const serverError = data.error?.message || data.error_description || data.message || res.statusText;
      const errInfo = serializeError(
        { message: serverError, status: res.status, data },
      );
      stepLog.error(
        {
          type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
          functionName: 'fetchJson',
          err: errInfo,
          url,
        },
        `fetchJson failed: ${serverError}`,
      );
      throw new Error(serverError);
    }
    stepLog.debug({ phase: 'fetch:success' }, 'fetchJson succeeded');
    return data;
  } catch (err) {
    const serverError = err.message || 'unknown fetch error';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'fetchJson',
        err: errInfo,
        url,
      },
      `fetchJson error: ${serverError}`,
    );
    throw err;
  }
}