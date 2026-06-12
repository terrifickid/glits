import { Redis } from '@upstash/redis';
import { log, LOG_TYPE, serializeError } from '$lib/logger.js';

// Upstash Redis client (Vercel Marketplace injects UPSTASH_KV_*; support common fallbacks too)
const redis = new Redis({
  url:
    process.env.UPSTASH_KV_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '',
  token:
    process.env.UPSTASH_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '',
});

const fnLog = log.child({ functionName: 'saveToken' });
const validateLog = log.child({ functionName: 'validateBlobPermissions' });

export async function validateBlobPermissions() {
  const stepLog = validateLog.child({ phase: 'store:validate' });

  stepLog.info('Checking access to token store (Upstash Redis)');

  const hasUrl = !!(process.env.UPSTASH_KV_REST_API_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
  const hasToken = !!(process.env.UPSTASH_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);

  if (!hasUrl || !hasToken) {
    stepLog.error({ type: LOG_TYPE.STORE_ERROR }, 'UPSTASH_KV_REST_API_URL / UPSTASH_KV_REST_API_TOKEN (or fallback) credentials missing');
    throw new Error('UPSTASH_KV_REST_API_URL and UPSTASH_KV_REST_API_TOKEN (or equivalent KV_/UPSTASH_REDIS_*) are not set in the environment');
  }

  stepLog.info('Token store credentials present');

  try {
    // Test connectivity
    stepLog.info('Testing store access');
    await redis.ping();

    // Test write/read using same key style as real tokens
    stepLog.info('Testing write/read access');
    const testKey = `tokens/_validation_test_${Date.now()}.json`;
    const testValue = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
    await redis.set(testKey, testValue);
    const readBack = await redis.get(testKey);
    if (!readBack) throw new Error('Test read after write returned no value');
    await redis.del(testKey);

    stepLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS },
      'Confirmed read/write access to token store'
    );
  } catch (err) {
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.STORE_ERROR,
        err: errInfo,
      },
      `Token store access check failed: ${err.message || 'unknown error'}`
    );
    throw new Error(`Failed to validate token store connection and write permission: ${err.message || 'unknown error'}`);
  }
}

export async function saveToken(pathname, data) {
  // First step: validate store connection and write permission before any save
  await validateBlobPermissions();

  const stepLog = fnLog.child({ phase: 'store:save:start', pathname });
  stepLog.info(
    {
      type: LOG_TYPE.STORE_SAVE_START,
      dataKeys: Object.keys(data || {}),
      hasAccessToken: !!data?.access_token,
    },
    'Starting token store private save for token',
  );

  try {
    await redis.set(pathname, JSON.stringify(data));
    stepLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname },
      'Token store save succeeded',
    );
  } catch (err) {
    const serverError = err.message || 'Token store save failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.STORE_ERROR,
        err: errInfo,
        pathname,
      },
      `Token store save failed: ${serverError}`,
    );
    throw err;
  }
}

const loadLog = log.child({ functionName: 'loadToken' });

export async function loadToken(pathname) {
  // Validate store connection and permission when accessing
  await validateBlobPermissions();

  const stepLog = loadLog.child({ phase: 'store:load:start', pathname });
  stepLog.info('Starting token store load for token');

  try {
    const val = await redis.get(pathname);
    if (val == null) {
      const serverError = `Failed to read token ${pathname}: key not found or no value`;
      const err = new Error(serverError);
      err.status = 404;
      err.pathname = pathname;
      const errInfo = serializeError(err);
      stepLog.error(
        {
          type: LOG_TYPE.STORE_ERROR,
          err: errInfo,
          pathname,
        },
        `Token store load failed: ${serverError}`,
      );
      throw err;
    }
    const token = JSON.parse(val);
    stepLog.info({ phase: 'store:load:success', hasAccessToken: !!token?.access_token }, 'Token store load succeeded');
    return token;
  } catch (err) {
    const serverError = err.message || 'Token store load failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.STORE_ERROR,
        err: errInfo,
        pathname,
      },
      `Token store load failed: ${serverError}`,
    );
    throw err;
  }
}