import * as bluesky from './bluesky.js';
import * as mastodon from './mastodon.js';
import * as x from './x.js';
import * as threads from './threads.js';
import * as instagram from './instagram.js';
import * as linkedin from './linkedin.js';
import * as youtube from './youtube.js';
import * as facebook from './facebook.js';
import * as nostr from './nostr.js';

const platforms = {
  bluesky,
  mastodon,
  x,
  threads,
  instagram,
  linkedin,
  youtube,
  facebook,
  nostr,
};

export function getPlatform(name) {
  const platform = platforms[name];
  if (!platform) {
    throw new Error(`Unknown platform: ${name}`);
  }
  return platform;
}