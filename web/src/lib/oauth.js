import crypto from 'node:crypto';

export function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

export async function exchangeCode({
  tokenUrl,
  body,
  headers = { 'Content-Type': 'application/x-www-form-urlencoded' },
}) {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || res.statusText);
  }
  return {
    ...data,
    obtained_at: new Date().toISOString(),
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  };
}

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || data.error_description || data.message || res.statusText);
  }
  return data;
}