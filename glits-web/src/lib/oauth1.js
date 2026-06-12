// Minimal OAuth 1.0a signer for X (Twitter) API User Context (duplicated for glits-web isolation)
// Elemental implementation using Node built-in crypto (no external deps).
// Follows exact X docs.

import crypto from 'node:crypto';

export function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildBaseString(method, url, params) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sorted)}`;
}

function createSignature(baseString, signingKey) {
  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

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

  const headerParts = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(params[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}
