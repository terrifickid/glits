import { head, put } from '@vercel/blob';

export async function saveToken(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function loadToken(pathname) {
  const meta = await head(pathname);
  const res = await fetch(meta.downloadUrl);
  if (!res.ok) {
    throw new Error(`Failed to read blob ${pathname}: ${res.status}`);
  }
  return JSON.parse(await res.text());
}