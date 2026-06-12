import { env } from '$env/dynamic/private';

export function redirectBase() {
  if (env.OAUTH_REDIRECT_BASE) return env.OAUTH_REDIRECT_BASE.replace(/\/$/, '');
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

export function mustEnv(key) {
  const val = env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}