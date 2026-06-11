import { list, head } from '@vercel/blob';
import { isExpired } from './lib/oauth-token.js';

const TOKEN_PREFIX = 'tokens/';

export async function listTokenBlobs() {
  try {
    const { blobs } = await list({ prefix: TOKEN_PREFIX });
    return blobs;
  } catch (err) {
    // Enrich so logger in callers sees full Blob error details
    err.isBlobListError = true;
    err.prefix = TOKEN_PREFIX;
    throw err;
  }
}

export async function getTokenBlob(pathname) {
  const meta = await head(pathname);
  const res = await fetch(meta.downloadUrl);
  if (!res.ok) {
    const err = new Error(`Failed to read token ${pathname}: ${res.status}`);
    err.status = res.status;
    err.pathname = pathname;
    err.response = { status: res.status };
    throw err;
  }
  return JSON.parse(await res.text());
}

export function platformFromTokenPath(pathname) {
  const name = pathname.replace(TOKEN_PREFIX, '').replace(/\.json$/, '');
  const dash = name.lastIndexOf('-');
  if (dash === -1) return null;
  return name.slice(dash + 1);
}

export async function getTokensForPlatform(platform) {
  const blobs = await listTokenBlobs();
  const matched = blobs.filter((b) => platformFromTokenPath(b.pathname) === platform);

  const tokens = [];
  for (const blob of matched) {
    tokens.push({
      pathname: blob.pathname,
      data: await getTokenBlob(blob.pathname),
    });
  }
  return tokens;
}

/**
 * Safe, redacted summary of a stored token for inspection / agent use.
 * Never includes secret values (access_token, nsec, JWTs, etc.).
 */
function summarizeToken(pathname, data) {
  const platform = platformFromTokenPath(pathname) || 'unknown';

  // Best-effort non-sensitive account identifier
  const account =
    data.handle ||
    data.username ||
    data.user_pubkey?.slice(0, 16) ||
    data.ig_user_id ||
    data.threads_user_id ||
    data.page_id ||
    data.author_urn ||
    (data.did ? String(data.did).split(':').pop()?.slice(0, 12) : null) ||
    'unknown';

  // Compute expiry using the shared pure function (works even without client secrets)
  let expired = null;
  let expires_at = data.expires_at || null;
  if (!expires_at && data.obtained_at && data.expires_in) {
    expires_at = new Date(new Date(data.obtained_at).getTime() + Number(data.expires_in) * 1000).toISOString();
  }
  try {
    expired = isExpired(data);
  } catch {
    expired = null;
  }

  const status = expired === true ? 'expired' : (expired === false ? 'valid' : 'unknown');

  return {
    pathname,
    platform,
    account: String(account),
    obtained_at: data.obtained_at || null,
    expires_at,
    expired,
    has_refresh_token: !!data.refresh_token,
    status,
  };
}

/**
 * List ALL authorized tokens across every platform.
 * Returns an array of safe summary objects (no secrets).
 * Requires the skill's declared storage credential to be present in the environment.
 */
export async function listAllTokens() {
  const blobs = await listTokenBlobs();
  const summaries = [];
  for (const blob of blobs) {
    try {
      const data = await getTokenBlob(blob.pathname);
      summaries.push(summarizeToken(blob.pathname, data));
    } catch (err) {
      summaries.push({
        pathname: blob.pathname,
        platform: platformFromTokenPath(blob.pathname),
        error: `unreadable: ${err.message || err}`,
        status: 'error',
      });
    }
  }
  // Stable sort: platform then account
  summaries.sort((a, b) => {
    if (a.platform !== b.platform) return (a.platform || '').localeCompare(b.platform || '');
    return (a.account || '').localeCompare(b.account || '');
  });
  return summaries;
}
