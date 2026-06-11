import { buildStub, sendStub } from './stub.js';

export const name = 'threads';

export function buildPost(opts) {
  const post = buildStub(name, opts);
  let text = opts.text || '';
  if (opts.link && !text.includes(opts.link)) {
    text = text ? `${text} ${opts.link}` : opts.link;
  }

  if (opts.videoUrls?.length) {
    post.payload = {
      media_type: 'VIDEO',
      video_url: opts.videoUrls[0],
      text,
    };
  } else if (opts.imageUrls?.length) {
    post.payload = {
      media_type: 'IMAGE',
      image_url: opts.imageUrls[0],
      text,
    };
  } else {
    post.payload = {
      media_type: 'TEXT',
      text,
      ...(opts.link ? { link_attachment: opts.link } : {}),
    };
  }
  return post;
}

export const send = () => sendStub(name);