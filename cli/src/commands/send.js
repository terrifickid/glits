import path from 'node:path';
import { getEnabledPlatforms } from '../config.js';
import { listQueueFiles, readQueueFile, writeQueueFile } from '../queue.js';
import { getTokensForPlatform } from '../tokens.js';
import { getPlatform } from '../platforms/index.js';

function shouldSend(post, retry) {
  if (post.status === 'queued') return true;
  if (retry && post.status === 'failed') return true;
  return false;
}

export async function sendCommand(opts) {
  const enabled = new Set(await getEnabledPlatforms());
  const files = await listQueueFiles(opts.queue);

  if (!files.length) {
    console.log(`No queue files in ${opts.queue}`);
    return;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const post = await readQueueFile(filePath);
    const name = path.basename(filePath);

    if (!enabled.has(post.platform)) {
      console.log(`skip ${name} (platform disabled in config)`);
      skipped++;
      continue;
    }

    if (!shouldSend(post, opts.retry)) {
      console.log(`skip ${name} (${post.status})`);
      skipped++;
      continue;
    }

    const tokens = await getTokensForPlatform(post.platform);
    if (!tokens.length) {
      post.status = 'failed';
      post.last_attempt_at = new Date().toISOString();
      post.error = `No tokens found for platform: ${post.platform}`;
      await writeQueueFile(filePath, post);
      console.error(`fail ${name}: ${post.error}`);
      failed++;
      continue;
    }

    const platform = getPlatform(post.platform);
    const results = [];
    let anyFailed = false;

    post.last_attempt_at = new Date().toISOString();

    for (const token of tokens) {
      try {
        if (opts.dryRun) {
          results.push({ token: token.pathname, status: 'dry-run' });
          continue;
        }
        const { platform_post_id } = await platform.send(post, token.data, { dryRun: false });
        results.push({ token: token.pathname, status: 'sent', platform_post_id });
      } catch (err) {
        anyFailed = true;
        results.push({ token: token.pathname, status: 'failed', error: err.message });
      }
    }

    post.results = results;

    if (anyFailed && results.some((r) => r.status === 'sent')) {
      post.status = 'failed';
      post.error = 'Partial failure — some accounts failed';
      failed++;
      console.error(`fail ${name}: partial failure`);
    } else if (anyFailed) {
      post.status = 'failed';
      post.error = results.find((r) => r.error)?.error || 'Send failed';
      failed++;
      console.error(`fail ${name}: ${post.error}`);
    } else {
      post.status = opts.dryRun ? 'queued' : 'sent';
      post.sent_at = opts.dryRun ? undefined : new Date().toISOString();
      post.error = null;
      post.platform_post_id = results[0]?.platform_post_id;
      sent++;
      console.log(`${opts.dryRun ? 'dry-run' : 'sent'} ${name} → ${tokens.length} account(s)`);
    }

    await writeQueueFile(filePath, post);
  }

  console.log(`\ndone: ${sent} sent, ${failed} failed, ${skipped} skipped`);
}