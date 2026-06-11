import { buildStub, sendStub } from './stub.js';

export const name = 'x';

export function buildPost(opts) {
  const post = buildStub(name, opts);
  let text = opts.text || '';
  if (opts.link && !text.includes(opts.link)) {
    text = text ? `${text} ${opts.link}` : opts.link;
  }
  post.payload = { text };
  return post;
}

export const send = () => sendStub(name);