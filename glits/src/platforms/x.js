import { downloadUrl, isVideoMime } from '../lib/media.js';
import { fetchJson, formBody } from '../lib/http.js';
import { buildAuthHeader } from '../lib/oauth1.js';

export const name = 'x';

const CONSUMER_KEY = process.env.X_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.X_CONSUMER_SECRET;

export function buildPost(opts) {
  const media_urls = [...(opts.imageUrls || []), ...(opts.videoUrls || [])].filter(Boolean);
  let text = opts.text || '';
  if (opts.link && !text.includes(opts.link)) {
    text = text ? `${text} ${opts.link}` : opts.link;
  }

  return {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...(media_urls.length ? { media_urls } : {}),
    payload: { text },
  };
}

async function uploadMedia(tokenData, url) {
  const { buffer, mimeType } = await downloadUrl(url);
  const category = isVideoMime(mimeType) ? 'tweet_video' : 'tweet_image';

  const uploadUrl = 'https://api.x.com/2/media/upload';
  const form = new FormData();
  form.append('media', new Blob([buffer], { type: mimeType }), 'media');
  if (category) form.append('media_category', category);

  // Sign only the non-file params (per X OAuth1 docs for multipart)
  const extraParams = category ? { media_category: category } : {};
  const authHeader = buildAuthHeader({
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
    token: tokenData.oauth_token,
    tokenSecret: tokenData.oauth_token_secret,
    method: 'POST',
    url: uploadUrl,
    extraParams,
  });

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.title || data.error || res.statusText);
  }
  return data.data?.id || data.media_id_string || data.media_id;
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  if (dryRun) return { platform_post_id: 'dry-run' };

  const tweetUrl = 'https://api.x.com/2/tweets';
  const body = { ...post.payload };

  if (post.media_urls?.length) {
    const media_ids = [];
    for (const url of post.media_urls) {
      media_ids.push(await uploadMedia(tokenData, url));
    }
    body.media = { media_ids };
  }

  const authHeader = buildAuthHeader({
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
    token: tokenData.oauth_token,
    tokenSecret: tokenData.oauth_token_secret,
    method: 'POST',
    url: tweetUrl,
  });

  const data = await fetchJson(tweetUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return { platform_post_id: data.data?.id };
}