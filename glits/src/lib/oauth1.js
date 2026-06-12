// Minimal OAuth 1.0a signer for X (Twitter) API User Context
// Elemental implementation using Node built-in crypto (no external deps).
// Follows exact X docs: https://docs.x.com/fundamentals/authentication/oauth-1-0a/authorizing-a-request
// and https://docs.x.com/fundamentals/authentication/oauth-1-0a/obtaining-user-access-tokens

import crypto from 'node:crypto';

// Percent-encode per RFC 3986 (X's version of the rules)
export function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// Build the signature base string (method & url & params)
function buildBaseString(method, url, params) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sorted)}`;
}

// Create HMAC-SHA1 signature
function createSignature(baseString, signingKey) {
  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

// Build the full Authorization header value
export function buildAuthHeader({
  consumerKey,
  consumerSecret,
  token,
  tokenSecret,
  method,
  url,
  extraParams = {},
}) {
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...extraParams,
  };

  if (token) {
    params.oauth_token = token;
  }

  const signingKey = `${percentEncode(consumerSecret)}&${tokenSecret ? percentEncode(tokenSecret) : ''}`;
  const baseString = buildBaseString(method, url, params);
  params.oauth_signature = createSignature(baseString, signingKey);

  // Build header string
  const headerParts = Object.keys(params)
    .sort() // optional but consistent
    .map((k) => `${percentEncode(k)}="${percentEncode(params[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

// Convenience: sign and return headers object for fetch
export function signedHeaders({
  consumerKey,
  consumerSecret,
  token,
  tokenSecret,
  method,
  url,
  extraParams = {},
}) {
  const auth = buildAuthHeader({
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
    method,
    url,
    extraParams,
  });
  return {
    Authorization: auth,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}
