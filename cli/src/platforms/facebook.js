import { buildStub, sendStub } from './stub.js';

export const name = 'facebook';

export function buildPost(opts) {
  const post = buildStub(name, opts);
  let message = opts.text || '';
  if (opts.link && !message.includes(opts.link)) {
    message = message ? `${message} ${opts.link}` : opts.link;
  }

  post.payload = {
    message,
    ...(opts.link ? { link: opts.link } : {}),
  };
  return post;
}

export const send = () => sendStub(name);