import path from 'node:path';
import { getEnabledPlatforms } from '../config.js';
import { ensureQueueDir, writeQueueFile } from '../queue.js';
import { getPlatform } from '../platforms/index.js';
import { log, ERROR_TYPE } from '../lib/logger.js';

export async function createCommand(opts) {
  const cmdLog = log.child({ cmd: 'create', id: opts.id, queue: opts.queue, platformsOverride: opts.platforms || null });

  cmdLog.info({ opts: { id: opts.id, textLen: (opts.text || '').length, hasLink: !!opts.link, imageCount: (opts.imageUrl || []).length, videoCount: (opts.videoUrl || []).length } }, 'create command started');

  const platforms = await getEnabledPlatforms(opts.platforms);
  if (!platforms.length) {
    cmdLog.error({ type: ERROR_TYPE.CONFIG_ERROR, functionName: 'createCommand' }, 'No platforms enabled in glits.config.js');
    process.exit(1);
  }

  cmdLog.info({ platforms }, 'enabled platforms resolved');

  await ensureQueueDir(opts.queue);

  const input = {
    id: opts.id,
    text: opts.text,
    link: opts.link,
    imageUrls: opts.imageUrl || [],
    videoUrls: opts.videoUrl || [],
  };

  for (const platformName of platforms) {
    const platform = getPlatform(platformName);
    const post = platform.buildPost(input);
    const filePath = path.join(opts.queue, `${opts.id}-${platformName}.json`);
    await writeQueueFile(filePath, post);
    cmdLog.info({ platform: platformName, filePath }, 'created queue file');
  }

  cmdLog.info({ createdCount: platforms.length }, 'create command complete');
}