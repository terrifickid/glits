import { BskyAgent } from '@atproto/api';

export const name = 'bluesky';

export function buildPost({ id, text, link, imageUrls = [], videoUrls = [] }) {
  let body = text || '';
  if (link && !body.includes(link)) {
    body = body ? `${body} ${link}` : link;
  }

  const media_urls = [...imageUrls, ...videoUrls].filter(Boolean);

  return {
    id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...(media_urls.length ? { media_urls } : {}),
    payload: {
      $type: 'app.bsky.feed.post',
      text: body,
      createdAt: new Date().toISOString(),
    },
  };
}

function agentFromToken(tokenData) {
  const service = tokenData.service || 'https://bsky.social';
  const agent = new BskyAgent({ service });
  return agent;
}

async function uploadImage(agent, url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch media ${url}: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const { data } = await agent.uploadBlob(buf, { encoding: mimeType });
  return data.blob;
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  if (dryRun) {
    return { platform_post_id: 'dry-run' };
  }

  const agent = agentFromToken(tokenData);
  await agent.resumeSession(tokenData);

  const record = {
    ...post.payload,
    createdAt: new Date().toISOString(),
  };

  if (post.media_urls?.length) {
    const images = [];
    for (const url of post.media_urls) {
      const res = await fetch(url, { method: 'HEAD' });
      const mime = res.headers.get('content-type')?.split(';')[0] || '';
      if (!mime.startsWith('image/')) continue;
      const blob = await uploadImage(agent, url);
      images.push({ alt: '', image: blob });
    }
    if (images.length) {
      record.embed = {
        $type: 'app.bsky.embed.images',
        images: images.slice(0, 4),
      };
    }
  }

  const result = await agent.post(record);
  return { platform_post_id: result.uri };
}