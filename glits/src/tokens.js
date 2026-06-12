import { Redis } from '@upstash/redis';
import { isExpired } from './lib/oauth-token.js';

const TOKEN_PREFIX = 'tokens/';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_READ_ONLY_TOKEN,
});

export async function listTokenBlobs() {
  try {
    // Use keys for the tokens/ prefix (small cardinality; scan would also work)
    const keys = await redis.keys(`${TOKEN_PREFIX}*`);
    // Return shape compatible with previous callers (objects with .pathname)
    return keys.map((k) => ({ pathname: k }));
  } catch (err) {
    // Enrich so logger in callers sees full store error details
    err.isStoreListError = true;
    err.prefix = TOKEN_PREFIX;
    throw err;
  }
}

export async function getTokenBlob(pathname) {
  const val = await redis.get(pathname);
  if (val == null) {
    const err = new Error(`Failed to read token ${pathname}: key not found or no value`);
    err.status = 404;
    err.pathname = pathname;
    err.response = { status: 404 };
    throw err;
  }
  return JSON.parse(val);
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
  // For OAuth1 X tokens there is no refresh/expiry — treat as valid (until revoked)
  let expired = null;
  let expires_at = data.expires_at || null;
  const isXOAuth1 = platform === 'x' && data.oauth_token && !data.refresh_token;
  if (isXOAuth1) {
    expires_at = null;
    expired = false;
  } else {
    if (!expires_at && data.obtained_at && data.expires_in) {
      expires_at = new Date(new Date(data.obtained_at).getTime() + Number(data.expires_in) * 1000).toISOString();
    }
    try {
      expired = isExpired(data);
    } catch {
      expired = null;
    }
  }

  const status = expired === true ? 'expired' : (expired === false ? 'valid' : 'unknown');

  return {
    pathname,
    platform,
    account: String(account),
    obtained_at: data.obtained_at || null,
    expires_at,
    expired,
    has_refresh_token: !!data.refresh_token && !isXOAuth1,
    status,
  };
}

/**
 * List ALL authorized tokens across every platform.
 * Returns an array of safe summary objects (no secrets).
 * Requires the canonical storage credential (KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN) to be present in the environment.
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
