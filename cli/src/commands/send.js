import path from 'node:path';
import { getEnabledPlatforms } from '../config.js';
import { listQueueFiles, readQueueFile, writeQueueFile } from '../queue.js';
import { getTokensForPlatform } from '../tokens.js';
import { getPlatform } from '../platforms/index.js';
import { log, ERROR_TYPE, serializeError } from '../lib/logger.js';

function shouldSend(post, retry) {
  if (post.status === 'queued') return true;
  if (retry && post.status === 'failed') return true;
  return false;
}

export async function sendCommand(opts) {
  const cmdLog = log.child({
    cmd: 'send',
    queue: opts.queue,
    retry: !!opts.retry,
    dryRun: !!opts.dryRun,
  });

  cmdLog.info({ opts: { queue: opts.queue, retry: !!opts.retry, dryRun: !!opts.dryRun } }, 'send command started');

  let enabled;
  try {
    enabled = new Set(await getEnabledPlatforms());
  } catch (err) {
    cmdLog.error({ type: ERROR_TYPE.CONFIG_ERROR, functionName: 'sendCommand.getEnabledPlatforms', err }, 'Failed to load enabled platforms');
    throw err;
  }

  let files;
  try {
    files = await listQueueFiles(opts.queue);
  } catch (err) {
    cmdLog.error({ type: ERROR_TYPE.QUEUE_ERROR, functionName: 'sendCommand.listQueueFiles', err, queue: opts.queue }, 'Failed to list queue files');
    throw err;
  }

  if (!files.length) {
    cmdLog.info({ queue: opts.queue }, 'No queue files in queue dir');
    return;
  }

  cmdLog.info({ fileCount: files.length }, 'queue files discovered');

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    let post;
    let name;
    let fileLog;
    try {
      post = await readQueueFile(filePath);
      name = path.basename(filePath);
      fileLog = cmdLog.child({ file: name, platform: post.platform, id: post.id });
      fileLog.info({ status: post.status, created_at: post.created_at }, 'processing queue file');
    } catch (err) {
      cmdLog.error({ type: ERROR_TYPE.QUEUE_ERROR, functionName: 'sendCommand.readQueueFile', err, filePath }, 'Failed to read queue file — skipping');
      skipped++;
      continue;
    }

    if (!enabled.has(post.platform)) {
      fileLog.info({ reason: 'platform disabled in config' }, 'skip queue file');
      skipped++;
      continue;
    }

    if (!shouldSend(post, opts.retry)) {
      fileLog.info({ reason: `status ${post.status}`, retry: !!opts.retry }, 'skip queue file');
      skipped++;
      continue;
    }

    let tokens;
    try {
      tokens = await getTokensForPlatform(post.platform);
      fileLog.info({ tokenCount: tokens.length, tokens: tokens.map((t) => t.pathname) }, 'tokens loaded for platform');
    } catch (err) {
      fileLog.error({ type: ERROR_TYPE.BLOB_ERROR, functionName: 'sendCommand.getTokensForPlatform', err, platform: post.platform }, 'Failed to load tokens from Vercel Blob');
      post.status = 'failed';
      post.last_attempt_at = new Date().toISOString();
      post.error = 'Failed to load tokens from Vercel Blob';
      post.errorDetails = serializeError(err);
      await writeQueueFile(filePath, post);
      failed++;
      continue;
    }

    if (!tokens.length) {
      post.status = 'failed';
      post.last_attempt_at = new Date().toISOString();
      post.error = `No tokens found for platform: ${post.platform}`;
      await writeQueueFile(filePath, post);
      fileLog.error({ type: ERROR_TYPE.TOKEN_ERROR, functionName: 'sendCommand.getTokensForPlatform' }, post.error);
      failed++;
      continue;
    }

    const platform = getPlatform(post.platform);
    const results = [];
    let anyFailed = false;

    post.last_attempt_at = new Date().toISOString();

    for (const token of tokens) {
      const tokenLog = fileLog.child({ token: token.pathname });
      tokenLog.info('attempting send for token');

      try {
        if (opts.dryRun) {
          results.push({ token: token.pathname, status: 'dry-run' });
          tokenLog.info('dry-run (no platform call)');
          continue;
        }

        tokenLog.info('calling platform.send');
        const sendResult = await platform.send(post, token.data, { dryRun: false });
        const platform_post_id = sendResult?.platform_post_id;
        results.push({ token: token.pathname, status: 'sent', platform_post_id });
        tokenLog.info({ platform_post_id }, 'platform.send succeeded');
      } catch (err) {
        anyFailed = true;
        const errInfo = serializeError(err);
        const serverError = errInfo.message || 'platform send failed';
        results.push({ token: token.pathname, status: 'failed', error: serverError, errorDetails: errInfo });
        tokenLog.error(
          {
            type: ERROR_TYPE.PLATFORM_ERROR,
            functionName: `${post.platform}.send`,
            err: errInfo,
            postId: post.id,
          },
          `platform.send failed for token: ${serverError}`,
        );
      }
    }

    post.results = results;

    if (anyFailed && results.some((r) => r.status === 'sent')) {
      post.status = 'failed';
      const firstErr = results.find((r) => r.error)?.error || 'Partial failure';
      post.error = firstErr;
      post.errorDetails = results.find((r) => r.errorDetails)?.errorDetails || null;
      failed++;
      fileLog.error(
        { type: ERROR_TYPE.SEND_PARTIAL, results: results.map((r) => ({ token: r.token, status: r.status, error: r.error })) },
        `Partial failure for queue file: ${firstErr}`,
      );
    } else if (anyFailed) {
      post.status = 'failed';
      const firstErr = results.find((r) => r.error)?.error || 'Send failed';
      post.error = firstErr;
      post.errorDetails = results.find((r) => r.errorDetails)?.errorDetails || null;
      failed++;
      fileLog.error(
        { type: ERROR_TYPE.SEND_FAILED, error: post.error, results },
        `Send failed for queue file: ${firstErr}`,
      );
    } else {
      post.status = opts.dryRun ? 'queued' : 'sent';
      post.sent_at = opts.dryRun ? undefined : new Date().toISOString();
      post.error = null;
      post.errorDetails = null;
      post.platform_post_id = results[0]?.platform_post_id;
      sent++;
      fileLog.info(
        { status: post.status, sent_to: tokens.length, platform_post_id: post.platform_post_id },
        `${opts.dryRun ? 'dry-run' : 'sent'} queue file`,
      );
    }

    try {
      await writeQueueFile(filePath, post);
      fileLog.info({ finalStatus: post.status }, 'queue file updated with result');
    } catch (err) {
      fileLog.error({ type: ERROR_TYPE.QUEUE_ERROR, functionName: 'sendCommand.writeQueueFile', err }, 'Failed to write result back to queue file (state may be lost)');
    }
  }

  cmdLog.info({ sent, failed, skipped }, 'send command complete');
}