import { buildStub, sendStub } from './stub.js';

export const name = 'youtube';

export function buildPost(opts) {
  if (!opts.videoUrls?.length) {
    throw new Error('YouTube posts require --video-url');
  }

  const post = buildStub(name, opts);
  let description = opts.text || '';
  if (opts.link && !description.includes(opts.link)) {
    description = description ? `${description}\n${opts.link}` : opts.link;
  }

  post.payload = {
    snippet: {
      title: opts.text || opts.id,
      description,
      tags: [],
      categoryId: '22',
    },
    status: { privacyStatus: 'public' },
  };
  return post;
}

export const send = () => sendStub(name);