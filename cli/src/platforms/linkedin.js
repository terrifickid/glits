import { buildStub, sendStub } from './stub.js';

export const name = 'linkedin';

export function buildPost(opts) {
  const post = buildStub(name, opts);
  let commentary = opts.text || '';
  if (opts.link && !commentary.includes(opts.link)) {
    commentary = commentary ? `${commentary} ${opts.link}` : opts.link;
  }

  post.payload = {
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  return post;
}

export const send = () => sendStub(name);