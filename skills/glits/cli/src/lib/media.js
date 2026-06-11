export async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
  return { buffer, mimeType };
}

export function isVideoMime(mime) {
  return mime.startsWith('video/');
}

export function isImageMime(mime) {
  return mime.startsWith('image/');
}