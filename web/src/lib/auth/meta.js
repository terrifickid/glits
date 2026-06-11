import { fetchJson } from '../oauth.js';
import { log, LOG_TYPE, serializeError } from '$lib/logger.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const THREADS_GRAPH = 'https://graph.threads.net/v1.0';

const authUrlLog = log.child({ functionName: 'metaAuthUrl' });
export function metaAuthUrl({ appId, redirectUri, scope, state }) {
  authUrlLog.debug({ phase: 'meta:oauth:redirect:generate' }, 'Generating Meta OAuth URL');
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope,
    state,
    response_type: 'code',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

const exchangeLog = log.child({ functionName: 'exchangeMetaCode' });
export async function exchangeMetaCode({ appId, appSecret, redirectUri, code }) {
  const stepLog = exchangeLog.child({ phase: 'meta:exchange:start' });
  stepLog.info('Starting Meta code exchange (short + long token)');

  try {
    const url = `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    })}`;
    const short = await fetchJson(url);
    stepLog.debug({ phase: 'meta:exchange:short:success' }, 'Short token received');

    const longUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: short.access_token,
    })}`;
    const long = await fetchJson(longUrl);
    stepLog.info({ phase: 'meta:exchange:success' }, 'Meta long-lived token exchange succeeded');

    return {
      ...short,
      ...long,
      obtained_at: new Date().toISOString(),
      expires_at: long.expires_in
        ? new Date(Date.now() + long.expires_in * 1000).toISOString()
        : undefined,
    };
  } catch (err) {
    const serverError = err.message || 'Meta exchange failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.OAUTH_EXCHANGE_ERROR,
        functionName: 'exchangeMetaCode',
        err: errInfo,
      },
      `Meta code exchange failed: ${serverError}`,
    );
    throw err;
  }
}

const igLog = log.child({ functionName: 'getInstagramUserId' });
export async function getInstagramUserId(accessToken) {
  const stepLog = igLog.child({ phase: 'meta:ig:user:fetch:start' });
  stepLog.info('Fetching Instagram user ID from Meta');

  try {
    const pages = await fetchJson(
      `${GRAPH}/me/accounts?fields=instagram_business_account,name&access_token=${encodeURIComponent(accessToken)}`,
    );
    const page = pages.data?.find((p) => p.instagram_business_account?.id);
    if (!page) {
      const msg = 'No Instagram Business account linked to a Facebook Page';
      stepLog.error({ type: LOG_TYPE.VALIDATION_ERROR }, msg);
      throw new Error(msg);
    }
    stepLog.info({ phase: 'meta:ig:user:fetch:success' }, 'Instagram user ID fetched');
    return {
      ig_user_id: page.instagram_business_account.id,
      page_id: page.id,
      page_name: page.name,
    };
  } catch (err) {
    const serverError = err.message || 'IG user fetch failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.USER_FETCH_ERROR,
        err: errInfo,
      },
      `IG user fetch failed: ${serverError}`,
    );
    throw err;
  }
}

const threadsLog = log.child({ functionName: 'getThreadsUserId' });
export async function getThreadsUserId(accessToken) {
  const stepLog = threadsLog.child({ phase: 'meta:threads:user:fetch:start' });
  stepLog.info('Fetching Threads user ID');

  try {
    const me = await fetchJson(
      `${THREADS_GRAPH}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );
    stepLog.info({ phase: 'meta:threads:user:fetch:success' }, 'Threads user ID fetched');
    return { threads_user_id: me.id, username: me.username };
  } catch (err) {
    const serverError = err.message || 'Threads user fetch failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.USER_FETCH_ERROR,
        err: errInfo,
      },
      `Threads user fetch failed: ${serverError}`,
    );
    throw err;
  }
}

const fbLog = log.child({ functionName: 'getFacebookPage' });
export async function getFacebookPage(accessToken) {
  const stepLog = fbLog.child({ phase: 'meta:fb:page:fetch:start' });
  stepLog.info('Fetching Facebook Page');

  try {
    const pages = await fetchJson(
      `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`,
    );
    const page = pages.data?.[0];
    if (!page) {
      const msg = 'No Facebook Page found for this account';
      stepLog.error({ type: LOG_TYPE.VALIDATION_ERROR }, msg);
      throw new Error(msg);
    }
    stepLog.info({ phase: 'meta:fb:page:fetch:success' }, 'Facebook Page fetched');
    return {
      page_id: page.id,
      page_name: page.name,
      page_access_token: page.access_token,
    };
  } catch (err) {
    const serverError = err.message || 'FB page fetch failed';
    const errInfo = serializeError(err);
    stepLog.error(
      {
        type: LOG_TYPE.USER_FETCH_ERROR,
        err: errInfo,
      },
      `FB page fetch failed: ${serverError}`,
    );
    throw err;
  }
}