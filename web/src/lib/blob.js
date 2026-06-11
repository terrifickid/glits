import { head, put, list, del } from '@vercel/blob';
import { log, LOG_TYPE, serializeError } from '$lib/logger.js';

const fnLog = log.child({ functionName: 'saveToken' });
const validateLog = log.child({ functionName: 'validateBlobPermissions' });

export async function validateBlobPermissions() {
  const stepLog = validateLog.child({ phase: 'blob:validate' });

  stepLog.info('Checking access to blob storage');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    stepLog.error({ type: LOG_TYPE.BLOB_ERROR }, 'BLOB_READ_WRITE_TOKEN credential missing');
    throw new Error('BLOB_READ_WRITE_TOKEN is not set in the environment');
  }

  stepLog.info('BLOB_READ_WRITE_TOKEN credential present');

  try {
    // Test read/list access
    stepLog.info('Testing read access');
    await list({ prefix: 'tokens/', limit: 1 });
    stepLog.info('Read access confirmed');

    // Test write permission using the exact same options as real saves
    stepLog.info('Testing write access');
    const testKey = `tokens/_validation_test_${Date.now()}.json`;
    await put(testKey, JSON.stringify({ test: true, timestamp: new Date().toISOString() }), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json',
    });
    await del(testKey);

    stepLog.info(
      { type: LOG_TYPE.BLOB_SAVE_SUCCESS },
      'Confirmed read/write access to blob storage'
    );
  } catch (err) {
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.BLOB_ERROR,
        err: errInfo,
      },
      `Blob access check failed: ${err.message || 'unknown error'}`
    );
    throw new Error(`Failed to validate blob connection and write permission: ${err.message || 'unknown error'}`);
  }
}

export async function saveToken(pathname, data) {
  // First step: validate blob connection and write permission before any save
  await validateBlobPermissions();

  const stepLog = fnLog.child({ phase: 'blob:save:start', pathname });
  stepLog.info(
    {
      type: LOG_TYPE.BLOB_SAVE_START,
      dataKeys: Object.keys(data || {}),
      hasAccessToken: !!data?.access_token,
    },
    'Starting Vercel Blob private save for token',
  );

  try {
    await put(pathname, JSON.stringify(data), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json',
    });
    stepLog.info(
      { type: LOG_TYPE.BLOB_SAVE_SUCCESS, pathname },
      'Vercel Blob save succeeded',
    );
  } catch (err) {
    const serverError = err.message || 'Vercel Blob save failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.BLOB_ERROR,
        err: errInfo,
        pathname,
      },
      `Vercel Blob save failed: ${serverError}`,
    );
    throw err;
  }
}

const loadLog = log.child({ functionName: 'loadToken' });

export async function loadToken(pathname) {
  // Validate blob connection and permission when accessing blob
  await validateBlobPermissions();

  const stepLog = loadLog.child({ phase: 'blob:load:start', pathname });
  stepLog.info('Starting Vercel Blob load for token');

  try {
    const meta = await head(pathname);
    const res = await fetch(meta.downloadUrl);
    if (!res.ok) {
      const serverError = `Failed to read blob ${pathname}: ${res.status}`;
      const err = new Error(serverError);
      err.status = res.status;
      err.pathname = pathname;
      const errInfo = serializeError(err);
      stepLog.error(
        {
          type: LOG_TYPE.BLOB_ERROR,
          err: errInfo,
          pathname,
        },
        `Vercel Blob load failed: ${serverError}`,
      );
      throw err;
    }
    const token = JSON.parse(await res.text());
    stepLog.info({ phase: 'blob:load:success', hasAccessToken: !!token?.access_token }, 'Vercel Blob load succeeded');
    return token;
  } catch (err) {
    const serverError = err.message || 'Vercel Blob load failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.BLOB_ERROR,
        err: errInfo,
        pathname,
      },
      `Vercel Blob load failed: ${serverError}`,
    );
    throw err;
  }
}