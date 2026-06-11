import pino from 'pino';

/**
 * ERROR_TYPE constants following log-example.js.
 */
export const ERROR_TYPE = {
  UNCAUGHT_EXCEPTION: 'UNCAUGHT_EXCEPTION',
  UNHANDLED_REJECTION: 'UNHANDLED_REJECTION',
  STORE_ERROR: 'STORE_ERROR',
  QUEUE_ERROR: 'QUEUE_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR',
  PLATFORM_ERROR: 'PLATFORM_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  MEDIA_ERROR: 'MEDIA_ERROR',
  SEND_PARTIAL: 'SEND_PARTIAL',
  SEND_FAILED: 'SEND_FAILED',
  CONFIG_ERROR: 'CONFIG_ERROR',
};

export function serializeError(err) {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }
  const out = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
  };
  for (const key of ['status', 'statusCode', 'statusText', 'response', 'data', 'body', 'headers', 'cause']) {
    if (err[key] !== undefined) out[key] = err[key];
  }
  if (err.response?.data !== undefined) out.responseData = err.response.data;
  if (err.response?.status !== undefined) out.responseStatus = err.response.status;
  return out;
}

/**
 * pino logger for CLI, adapted from logger-example.js for Vercel/CLI use.
 * Explicit functionName + phases for diagnostic output.
 */
export function createLogger(overrides = {}) {
  const service = process.env.SERVICE_NAME || 'glits';
  const version = process.env.SERVICE_VERSION || '0.1.0';
  const level = process.env.LOG_LEVEL || 'info';

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

  return pino(baseConfig);
}

export const log = createLogger();
