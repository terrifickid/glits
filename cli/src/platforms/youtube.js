import { downloadUrl } from '../lib/media.js';
import { ensureAccessToken, refreshOAuthToken } from '../lib/oauth-token.js';

export const name = 'youtube';

export function buildPost(opts) {
  if (!opts.videoUrls?.length) {
    throw new Error('YouTube posts require --video-url');
  }

  const media_urls = opts.videoUrls;
  let description = opts.text || '';
  if (opts.link && !description.includes(opts.link)) {
    description = description ? `${description}\n${opts.link}` : opts.link;
  }

  return {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    media_urls,
    payload: {
      snippet: {
        title: opts.text || opts.id,
        description,
        tags: [],
        categoryId: '22',
      },
      status: { privacyStatus: 'public' },
    },
  };
}

async function refreshToken(tokenData) {
  return refreshOAuthToken(tokenData, {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });
}

async function resumableUpload(accessToken, videoUrl, metadata) {
  const { buffer, mimeType } = await downloadUrl(videoUrl);

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(buffer.length),
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload init failed: ${err}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube upload missing location header');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`YouTube upload failed: ${err}`);
  }

  return uploadRes.json();
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  if (dryRun) return { platform_post_id: 'dry-run' };

  const token = await ensureAccessToken(tokenData, refreshToken);
  const videoUrl = post.media_urls?.[0];
  if (!videoUrl) throw new Error('YouTube post missing media_urls');

  const data = await resumableUpload(token.access_token, videoUrl, {
    snippet: post.payload.snippet,
    status: post.payload.status,
  });

  return { platform_post_id: data.id };
}