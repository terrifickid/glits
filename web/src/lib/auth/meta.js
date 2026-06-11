import { fetchJson } from '../oauth.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const THREADS_GRAPH = 'https://graph.threads.net/v1.0';

export function metaAuthUrl({ appId, redirectUri, scope, state }) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope,
    state,
    response_type: 'code',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeMetaCode({ appId, appSecret, redirectUri, code }) {
  const url = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })}`;
  const short = await fetchJson(url);
  const longUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: short.access_token,
  })}`;
  const long = await fetchJson(longUrl);
  return {
    ...short,
    ...long,
    obtained_at: new Date().toISOString(),
    expires_at: long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : undefined,
  };
}

export async function getInstagramUserId(accessToken) {
  const pages = await fetchJson(
    `${GRAPH}/me/accounts?fields=instagram_business_account,name&access_token=${encodeURIComponent(accessToken)}`,
  );
  const page = pages.data?.find((p) => p.instagram_business_account?.id);
  if (!page) throw new Error('No Instagram Business account linked to a Facebook Page');
  return {
    ig_user_id: page.instagram_business_account.id,
    page_id: page.id,
    page_name: page.name,
  };
}

export async function getThreadsUserId(accessToken) {
  const me = await fetchJson(
    `${THREADS_GRAPH}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
  );
  return { threads_user_id: me.id, username: me.username };
}

export async function getFacebookPage(accessToken) {
  const pages = await fetchJson(
    `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`,
  );
  const page = pages.data?.[0];
  if (!page) throw new Error('No Facebook Page found for this account');
  return {
    page_id: page.id,
    page_name: page.name,
    page_access_token: page.access_token,
  };
}