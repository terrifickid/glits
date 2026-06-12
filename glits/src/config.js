import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Highest precedence: explicit --config on the command line (for agents: npx glits --config foo.js ...).
// Then GLITS_CONFIG env, then a glits.config.js in the current working directory.
let explicitFromArgv = null;
const cfgIdx = process.argv.indexOf('--config');
if (cfgIdx !== -1 && process.argv[cfgIdx + 1] && !process.argv[cfgIdx + 1].startsWith('-')) {
  explicitFromArgv = process.argv[cfgIdx + 1];
}
const configPath = explicitFromArgv
  || process.env.GLITS_CONFIG
  || path.resolve(process.cwd(), 'glits.config.js');

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