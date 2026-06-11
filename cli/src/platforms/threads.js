import { META_HOSTS, sendMetaTwoStep } from '../lib/meta.js';

export const name = 'threads';

export function buildPost(opts) {
  const media_urls = [...(opts.imageUrls || []), ...(opts.videoUrls || [])].filter(Boolean);
  let text = opts.text || '';
  if (opts.link && !text.includes(opts.link)) {
    text = text ? `${text} ${opts.link}` : opts.link;
  }

  if (opts.videoUrls?.length) {
    return {
      id: opts.id,
      platform: name,
      status: 'queued',
      created_at: new Date().toISOString(),
      media_urls,
      payload: {
        media_type: 'VIDEO',
        video_url: opts.videoUrls[0],
        text,
      },
    };
  }

  if (opts.imageUrls?.length) {
    return {
      id: opts.id,
      platform: name,
      status: 'queued',
      created_at: new Date().toISOString(),
      media_urls,
      payload: {
        media_type: 'IMAGE',
        image_url: opts.imageUrls[0],
        text,
      },
    };
  }

  return {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    payload: {
      media_type: 'TEXT',
      text,
      ...(opts.link ? { link_attachment: opts.link } : {}),
    },
  };
}

export async function send(post, tokenData, opts = {}) {
  if (opts.dryRun) return { platform_post_id: 'dry-run' };
  return sendMetaTwoStep(tokenData, post, {
    host: META_HOSTS.threads,
    userIdField: 'threads_user_id',
    createPath: 'threads',
    publishPath: 'threads_publish',
    publishDelayMs: 5000,
  });
}