import { error } from '@sveltejs/kit';
import {
  DEFAULT_OG_IMAGE,
  HASHTAGS,
  LINK,
  PRESSKIT_TEXT,
  formatShareText,
} from '$lib/presskit.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, fetch, url }) {
  const { id } = params;

  if (id === 'presskit') {
    return {
      shareText: formatShareText(PRESSKIT_TEXT),
      title: 'Future Caribbean Buildathon',
      link: LINK,
      image: DEFAULT_OG_IMAGE,
      shareUrl: url.href,
    };
  }

  const res = await fetch('/social.json');
  const posts = res.ok ? await res.json() : [];
  const post = posts.find((p) => p.id === id);
  if (!post) throw error(404, 'Post not found');

  return {
    shareText: formatShareText(post.text),
    title: 'Future Caribbean Buildathon',
    link: post.link || LINK,
    image: post.images?.square || DEFAULT_OG_IMAGE,
    shareUrl: url.href,
  };
}