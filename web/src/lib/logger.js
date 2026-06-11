import pino from 'pino';

/**
 * ERROR_TYPE and LOG_TYPE constants.
 * Use for every log to categorize success/error steps explicitly.
 * Follows log-example.js pattern for diagnostic power.
 */
export const LOG_TYPE = {
  // Success process steps
  OAUTH_REDIRECT: 'OAUTH_REDIRECT',
  OAUTH_STATE_SET: 'OAUTH_STATE_SET',
  EXCHANGE_START: 'EXCHANGE_START',
  EXCHANGE_RESPONSE: 'EXCHANGE_RESPONSE',
  USER_FETCH_START: 'USER_FETCH_START',
  USER_FETCH_SUCCESS: 'USER_FETCH_SUCCESS',
  STORE_SAVE_START: 'STORE_SAVE_START',
  STORE_SAVE_SUCCESS: 'STORE_SAVE_SUCCESS',
  NOSTR_SESSION_START: 'NOSTR_SESSION_START',
  NOSTR_PENDING_SAVE: 'NOSTR_PENDING_SAVE',
  NOSTR_BUNKER_WAIT: 'NOSTR_BUNKER_WAIT',
  NOSTR_CONNECT: 'NOSTR_CONNECT',
  NOSTR_HANDLE_REQUEST: 'NOSTR_HANDLE_REQUEST',
  NOSTR_DELEGATE_SIGN: 'NOSTR_DELEGATE_SIGN',
  SUCCESS: 'SUCCESS',

  // Error types (from log-example.js + expanded)
  UNCAUGHT_EXCEPTION: 'UNCAUGHT_EXCEPTION',
  UNHANDLED_REJECTION: 'UNHANDLED_REJECTION',
  STORE_ERROR: 'STORE_ERROR',
  OAUTH_EXCHANGE_ERROR: 'OAUTH_EXCHANGE_ERROR',
  USER_FETCH_ERROR: 'USER_FETCH_ERROR',
  STATE_MISMATCH: 'STATE_MISMATCH',
  NOSTR_DELEGATION_ERROR: 'NOSTR_DELEGATION_ERROR',
  NOSTR_BUNKER_ERROR: 'NOSTR_BUNKER_ERROR',
  TOKEN_SAVE_ERROR: 'TOKEN_SAVE_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
};

/**
 * Serialize error with full details for diagnostic output.
 * Includes function name context when passed.
 */
export function serializeError(err, functionName = null) {
  if (!err || typeof err !== 'object') {
    return { message: String(err), functionName };
  }
  const out = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
    functionName,
  };
  for (const key of ['status', 'statusCode', 'statusText', 'response', 'data', 'body', 'headers', 'cause']) {
    if (err[key] !== undefined) out[key] = err[key];
  }
  if (err.response?.data !== undefined) out.responseData = err.response.data;
  if (err.response?.status !== undefined) out.responseStatus = err.response.status;
  return out;
}

/**
 * Create pino logger for SvelteKit web on Vercel.
 * Adapted from logger-example.js (no GCP hard dep).
 * Emphasizes functionName, phases, rich context for abnormally explicit diagnostics.
 * Output: structured JSON (human "message" first for Vercel clarity + full details).
 * Use LOG_LEVEL env. Child loggers for context (provider, session, etc.).
 *
 * Usage example (in function):
 *   const log = createLogger();
 *   const fnLog = log.child({ provider: 'bluesky', functionName: 'default' });
 *   fnLog.info({ phase: 'store:save:start', pathname }, 'Starting token store save');
 *   fnLog.error({ type: LOG_TYPE.STORE_ERROR, err: serializeError(err), ... }, 'Token store save failed');
 */
export function createLogger(overrides = {}) {
  const service = process.env.SERVICE_NAME || 'glits-web';
  const version = process.env.SERVICE_VERSION || '0.1.0';
  const level = process.env.LOG_LEVEL || 'info';

  const isVercel = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');

  const baseConfig = {
    level,
    messageKey: 'message',
    formatters: {
      level(label, number) {
        return { severity: label.toUpperCase(), level: number };
      },
    },
    base: { service, version },
    ...overrides,
  };

  const logger = pino(baseConfig);

  if (!isVercel && process.env.LOG_LEVEL) {
    console.warn(`[glits] Web logger dev mode. level=${level}. Use LOG_LEVEL=debug for more. Vercel will see clean structured JSON.`);
  }

  return logger;
}

export const log = createLogger();

export function authEntry(phase, data = {}) {
  return { phase, ...data };
}
