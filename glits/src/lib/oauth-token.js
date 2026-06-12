import { fetchJson, formBody } from './http.js';

export function isExpired(tokenData, bufferSeconds = 120) {
  if (!tokenData.expires_at && !tokenData.expires_in && !tokenData.obtained_at) return false;
  const expiresAt = tokenData.expires_at
    ? new Date(tokenData.expires_at).getTime()
    : new Date(tokenData.obtained_at).getTime() + (tokenData.expires_in || 0) * 1000;
  return Date.now() >= expiresAt - bufferSeconds * 1000;
}

export async function refreshOAuthToken(tokenData, {
  tokenUrl,
  clientId,
  clientSecret,
  refreshToken,
}) {
  // OAuth 1.0a user tokens for X have no refresh (long-lived until revoked) — skip for X
  if (!tokenData.refresh_token && !refreshToken) {
    return tokenData;
  }

  const body = formBody({
    grant_type: 'refresh_token',
    refresh_token: refreshToken || tokenData.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientId && clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  const data = await fetchJson(tokenUrl, { method: 'POST', headers, body });
  return {
    ...tokenData,
    ...data,
    obtained_at: new Date().toISOString(),
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : tokenData.expires_at,
  };
}

export async function ensureAccessToken(tokenData, refreshFn) {
  if (isExpired(tokenData) && tokenData.refresh_token) {
    return refreshFn(tokenData);
  }
  return tokenData;
}