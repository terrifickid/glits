import { fetchJson, formBody } from '../lib/http.js';

export const name = 'facebook';

export function buildPost(opts) {
  const media_urls = [...(opts.imageUrls || []), ...(opts.videoUrls || [])].filter(Boolean);
  let message = opts.text || '';
  if (opts.link && !message.includes(opts.link)) {
    message = message ? `${message} ${opts.link}` : opts.link;
  }

  return {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...(media_urls.length ? { media_urls } : {}),
    payload: {
      message,
      ...(opts.link ? { link: opts.link } : {}),
    },
  };
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  if (dryRun) return { platform_post_id: 'dry-run' };

  const pageId = tokenData.page_id;
  const accessToken = tokenData.page_access_token || tokenData.access_token;
  if (!pageId) throw new Error('Token missing page_id');

  const imageUrl = post.media_urls?.find((u) => /\.(jpe?g|png|gif|webp)/i.test(u) || u.includes('image'));

  if (imageUrl || post.media_urls?.[0]) {
    const url = imageUrl || post.media_urls[0];
    const data = await fetchJson(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({
        url,
        caption: post.payload.message,
        access_token: accessToken,
      }),
    });
    return { platform_post_id: String(data.id || data.post_id) };
  }

  const data = await fetchJson(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      message: post.payload.message,
      link: post.payload.link,
      access_token: accessToken,
    }),
  });

  return { platform_post_id: String(data.id) };
}