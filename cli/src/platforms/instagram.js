import { META_HOSTS, sendMetaTwoStep } from '../lib/meta.js';

export const name = 'instagram';

export function buildPost(opts) {
  const media_urls = [...(opts.imageUrls || []), ...(opts.videoUrls || [])].filter(Boolean);
  let caption = opts.text || '';
  if (opts.link && !caption.includes(opts.link)) {
    caption = caption ? `${caption} ${opts.link}` : opts.link;
  }

  if (opts.videoUrls?.length) {
    return {
      id: opts.id,
      platform: name,
      status: 'queued',
      created_at: new Date().toISOString(),
      media_urls,
      payload: {
        video_url: opts.videoUrls[0],
        media_type: 'REELS',
        caption,
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
        image_url: opts.imageUrls[0],
        caption,
      },
    };
  }

  throw new Error('Instagram posts require --image-url or --video-url');
}

export async function send(post, tokenData, opts = {}) {
  if (opts.dryRun) return { platform_post_id: 'dry-run' };
  return sendMetaTwoStep(tokenData, post, {
    host: META_HOSTS.instagram,
    userIdField: 'ig_user_id',
  });
}