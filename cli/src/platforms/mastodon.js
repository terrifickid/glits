import { buildStub, sendStub } from './stub.js';

export const name = 'mastodon';

export function buildPost(opts) {
  const post = buildStub(name, opts);
  let status = opts.text || '';
  if (opts.link && !status.includes(opts.link)) {
    status = status ? `${status} ${opts.link}` : opts.link;
  }
  post.payload = { status, visibility: 'public' };
  return post;
}

export const send = () => sendStub(name);