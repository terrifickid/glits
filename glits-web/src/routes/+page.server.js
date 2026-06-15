/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
  const res = await fetch('/social.json');
  const posts = res.ok ? await res.json() : [];
  return { posts };
}