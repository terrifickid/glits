export function buildStub(name, { id, text, link, imageUrls = [], videoUrls = [] }) {
  const media_urls = [...imageUrls, ...videoUrls].filter(Boolean);
  return {
    id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...(media_urls.length ? { media_urls } : {}),
    payload: {
      text,
      ...(link ? { link } : {}),
    },
  };
}

export async function sendStub(name) {
  throw new Error(`Platform "${name}" is not implemented yet`);
}