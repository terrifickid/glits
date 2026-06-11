import { list, head } from '@vercel/blob';

const TOKEN_PREFIX = 'tokens/';

export async function listTokenBlobs() {
  const { blobs } = await list({ prefix: TOKEN_PREFIX });
  return blobs;
}

export async function getTokenBlob(pathname) {
  const meta = await head(pathname);
  const res = await fetch(meta.downloadUrl);
  if (!res.ok) {
    throw new Error(`Failed to read token ${pathname}: ${res.status}`);
  }
  return JSON.parse(await res.text());
}

export function platformFromTokenPath(pathname) {
  const name = pathname.replace(TOKEN_PREFIX, '').replace(/\.json$/, '');
  const dash = name.lastIndexOf('-');
  if (dash === -1) return null;
  return name.slice(dash + 1);
}

export async function getTokensForPlatform(platform) {
  const blobs = await listTokenBlobs();
  const matched = blobs.filter((b) => platformFromTokenPath(b.pathname) === platform);

  const tokens = [];
  for (const blob of matched) {
    tokens.push({
      pathname: blob.pathname,
      data: await getTokenBlob(blob.pathname),
    });
  }
  return tokens;
}