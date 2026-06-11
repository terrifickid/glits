import path from 'node:path';
import { getEnabledPlatforms } from '../config.js';
import { ensureQueueDir, writeQueueFile } from '../queue.js';
import { getPlatform } from '../platforms/index.js';

export async function createCommand(opts) {
  const platforms = await getEnabledPlatforms(opts.platforms);
  if (!platforms.length) {
    console.error('No platforms enabled in glits.config.js');
    process.exit(1);
  }

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
    console.log(`created ${filePath}`);
  }
}