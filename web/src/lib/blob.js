import { head, put } from '@vercel/blob';
import { log, LOG_TYPE, serializeError } from '$lib/logger.js';

const fnLog = log.child({ functionName: 'saveToken' });

export async function saveToken(pathname, data) {
  const stepLog = fnLog.child({ phase: 'blob:save:start', pathname });
  stepLog.info({ dataKeys: Object.keys(data || {}), hasAccessToken: !!data?.access_token }, 'Starting Vercel Blob private save for token');

  try {
    await put(pathname, JSON.stringify(data), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json',
    });
    stepLog.info({ phase: 'blob:save:success' }, 'Vercel Blob save succeeded');
  } catch (err) {
    const errInfo = serializeError(err, 'saveToken');
    stepLog.error(
      {
        type: LOG_TYPE.BLOB_ERROR,
        functionName: 'saveToken',
        err: errInfo,
        pathname,
      },
      'Vercel Blob save failed',
    );
    throw err;
  }
}

const loadLog = log.child({ functionName: 'loadToken' });

export async function loadToken(pathname) {
  const stepLog = loadLog.child({ phase: 'blob:load:start', pathname });
  stepLog.info('Starting Vercel Blob load for token');

  try {
    const meta = await head(pathname);
    const res = await fetch(meta.downloadUrl);
    if (!res.ok) {
      const err = new Error(`Failed to read blob ${pathname}: ${res.status}`);
      err.status = res.status;
      err.pathname = pathname;
      throw err;
    }
    const token = JSON.parse(await res.text());
    stepLog.info({ phase: 'blob:load:success', hasAccessToken: !!token?.access_token }, 'Vercel Blob load succeeded');
    return token;
  } catch (err) {
    const errInfo = serializeError(err, 'loadToken');
    stepLog.error(
      {
        type: LOG_TYPE.BLOB_ERROR,
        functionName: 'loadToken',
        err: errInfo,
        pathname,
      },
      'Vercel Blob load failed',
    );
    throw err;
  }
}