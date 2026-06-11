import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.GLITS_CONFIG
  || path.resolve(__dirname, '../../glits.config.js');

let cached;

export async function loadConfig() {
  if (!cached) {
    cached = (await import(pathToFileURL(configPath).href)).default;
  }
  return cached;
}

export async function getEnabledPlatforms(override) {
  const config = await loadConfig();
  if (override) {
    return override.split(',').map((p) => p.trim()).filter(Boolean);
  }
  return config.platforms;
}