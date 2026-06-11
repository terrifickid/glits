import { downloadUrl, isVideoMime } from '../lib/media.js';
import { fetchJson } from '../lib/http.js';
import { ensureAccessToken, refreshOAuthToken } from '../lib/oauth-token.js';

export const name = 'x';

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

async function refreshToken(tokenData) {
  return refreshOAuthToken(tokenData, {
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
    refreshToken: tokenData.refresh_token,
  });
}

async function uploadMedia(accessToken, url) {
  const { buffer, mimeType } = await downloadUrl(url);
  const category = isVideoMime(mimeType) ? 'tweet_video' : 'tweet_image';

  const form = new FormData();
  form.append('media', new Blob([buffer], { type: mimeType }), 'media');
  form.append('media_category', category);

  const res = await fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
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

  const token = await ensureAccessToken(tokenData, refreshToken);
  const accessToken = token.access_token;

  const body = { ...post.payload };
  if (post.media_urls?.length) {
    const media_ids = [];
    for (const url of post.media_urls) {
      media_ids.push(await uploadMedia(accessToken, url));
    }
    body.media = { media_ids };
  }

  const data = await fetchJson('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return { platform_post_id: data.data?.id };
}