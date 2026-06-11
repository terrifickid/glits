import { fetchJson, formBody } from './http.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const THREADS_GRAPH = 'https://graph.threads.net/v1.0';

export async function createContainer(host, userId, accessToken, payload, createPath = 'media') {
  const data = await fetchJson(`${host}/${userId}/${createPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ ...payload, access_token: accessToken }),
  });
  return data.id;
}

export async function waitForContainer(host, containerId, accessToken, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await fetchJson(
      `${host}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
      throw new Error(`Container ${data.status_code}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Container processing timed out');
}

export async function publishContainer(host, userId, accessToken, containerId, publishPath = 'media_publish') {
  const data = await fetchJson(`${host}/${userId}/${publishPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ creation_id: containerId, access_token: accessToken }),
  });
  return data.id;
}

export async function sendMetaTwoStep(tokenData, post, {
  host,
  userIdField,
  createPath = 'media',
  publishPath = 'media_publish',
  publishDelayMs = 0,
}) {
  const accessToken = tokenData.access_token;
  const userId = tokenData[userIdField];
  if (!userId) throw new Error(`Token missing ${userIdField}`);

  const containerId = await createContainer(host, userId, accessToken, post.payload, createPath);
  await waitForContainer(host, containerId, accessToken);
  if (publishDelayMs) await new Promise((r) => setTimeout(r, publishDelayMs));
  const mediaId = await publishContainer(host, userId, accessToken, containerId, publishPath);
  return { platform_post_id: String(mediaId) };
}

export const META_HOSTS = { instagram: GRAPH, threads: THREADS_GRAPH };