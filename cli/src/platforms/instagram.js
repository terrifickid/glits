import { buildStub, sendStub } from './stub.js';

export const name = 'instagram';

export function buildPost(opts) {
  const post = buildStub(name, opts);
  let caption = opts.text || '';
  if (opts.link && !caption.includes(opts.link)) {
    caption = caption ? `${caption} ${opts.link}` : opts.link;
  }

  if (opts.videoUrls?.length) {
    post.payload = {
      video_url: opts.videoUrls[0],
      media_type: 'REELS',
      caption,
    };
  } else if (opts.imageUrls?.length) {
    post.payload = {
      image_url: opts.imageUrls[0],
      caption,
    };
  } else {
    throw new Error('Instagram posts require --image-url or --video-url');
  }
  return post;
}

export const send = () => sendStub(name);