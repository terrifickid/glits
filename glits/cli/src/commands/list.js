import path from 'node:path';
import { listQueueFiles, readQueueFile } from '../queue.js';
import { log } from '../lib/logger.js';

export async function listCommand(opts) {
  const cmdLog = log.child({ cmd: 'list', queue: opts.queue });

  cmdLog.info('list command started');

  const files = await listQueueFiles(opts.queue);
  if (!files.length) {
    cmdLog.info({ queue: opts.queue }, 'No queue files in queue dir');
    return;
  }

  cmdLog.info({ fileCount: files.length }, 'queue files found');

  for (const filePath of files) {
    const post = await readQueueFile(filePath);
    const name = path.basename(filePath);
    cmdLog.info(
      {
        file: name,
        platform: post.platform,
        status: post.status,
        created_at: post.created_at,
        sent_at: post.sent_at,
        last_attempt_at: post.last_attempt_at,
        hasError: !!post.error,
        resultCount: post.results?.length || 0,
      },
      'queue file',
    );
  }

  cmdLog.info('list command complete');
}