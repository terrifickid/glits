import { downloadUrl } from '../lib/media.js';
import { fetchJson } from '../lib/http.js';

export const name = 'mastodon';

export function buildPost(opts) {
  const media_urls = [...(opts.imageUrls || []), ...(opts.videoUrls || [])].filter(Boolean);
  let status = opts.text || '';
  if (opts.link && !status.includes(opts.link)) {
    status = status ? `${status} ${opts.link}` : opts.link;
  }

  return {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...(media_urls.length ? { media_urls } : {}),
    payload: { status, visibility: 'public' },
  };
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  if (dryRun) return { platform_post_id: 'dry-run' };

  const instance = tokenData.instance?.replace(/\/$/, '');
  if (!instance) throw new Error('Token missing instance URL');

  const headers = { Authorization: `Bearer ${tokenData.access_token}` };
  const media_ids = [];

  for (const url of post.media_urls || []) {
    const { buffer, mimeType } = await downloadUrl(url);
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), 'upload');
    const uploaded = await fetchJson(`${instance}/api/v2/media`, {
      method: 'POST',
      headers,
      body: form,
    });
    media_ids.push(String(uploaded.id));
  }

  const form = new FormData();
  form.append('status', post.payload.status);
  form.append('visibility', post.payload.visibility || 'public');
  for (const id of media_ids) form.append('media_ids[]', id);

  const data = await fetchJson(`${instance}/api/v1/statuses`, {
    method: 'POST',
    headers,
    body: form,
  });

  return { platform_post_id: String(data.id) };
}