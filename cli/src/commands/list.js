import path from 'node:path';
import { listQueueFiles, readQueueFile } from '../queue.js';

export async function listCommand(opts) {
  const files = await listQueueFiles(opts.queue);
  if (!files.length) {
    console.log(`No queue files in ${opts.queue}`);
    return;
  }

  for (const filePath of files) {
    const post = await readQueueFile(filePath);
    const name = path.basename(filePath);
    console.log(`${name}  ${post.platform}  ${post.status}`);
  }
}