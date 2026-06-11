import { signAndPublish } from '../lib/nostr.js';

export const name = 'nostr';

export function buildPost(opts) {
  let content = opts.text || '';
  if (opts.link && !content.includes(opts.link)) {
    content = content ? `${content} ${opts.link}` : opts.link;
  }

  const tags = [];
  for (const url of opts.imageUrls || []) {
    tags.push(['imeta', `url ${url}`]);
  }
  for (const url of opts.videoUrls || []) {
    tags.push(['imeta', `url ${url}`, 'm video/*']);
  }

  return {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...((opts.imageUrls?.length || opts.videoUrls?.length) ? {
      media_urls: [...(opts.imageUrls || []), ...(opts.videoUrls || [])],
    } : {}),
    payload: {
      kind: 1,
      content,
      tags,
    },
  };
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  return signAndPublish(post.payload, tokenData, { dryRun });
}