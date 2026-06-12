import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureQueueDir(queueDir) {
  await fs.mkdir(queueDir, { recursive: true });
}

export async function listQueueFiles(queueDir) {
  let entries;
  try {
    entries = await fs.readdir(queueDir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  return entries
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(queueDir, f))
    .sort();
}

export async function readQueueFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function writeQueueFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}