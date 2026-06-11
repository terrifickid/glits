import { put } from '@vercel/blob';

export async function saveToken(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}