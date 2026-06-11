import { downloadUrl, isImageMime, isVideoMime } from '../lib/media.js';
import { fetchJson } from '../lib/http.js';
import { ensureAccessToken, refreshOAuthToken } from '../lib/oauth-token.js';

export const name = 'linkedin';

const API_VERSION = process.env.LINKEDIN_VERSION || '202505';

export function buildPost(opts) {
  const media_urls = [...(opts.imageUrls || []), ...(opts.videoUrls || [])].filter(Boolean);
  let commentary = opts.text || '';
  if (opts.link && !commentary.includes(opts.link)) {
    commentary = commentary ? `${commentary} ${opts.link}` : opts.link;
  }

  const post = {
    id: opts.id,
    platform: name,
    status: 'queued',
    created_at: new Date().toISOString(),
    ...(media_urls.length ? { media_urls } : {}),
    payload: {
      commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    },
  };

  if (opts.link && !media_urls.length) {
    post.payload.content = {
      article: {
        source: opts.link,
        title: opts.text || opts.id,
        description: commentary,
      },
    };
  }

  return post;
}

function linkedinHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'Linkedin-Version': API_VERSION,
  };
}

async function refreshToken(tokenData) {
  return refreshOAuthToken(tokenData, {
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  });
}

async function uploadImage(accessToken, author, url) {
  const { buffer, mimeType } = await downloadUrl(url);
  if (!isImageMime(mimeType)) throw new Error(`LinkedIn image upload requires image, got ${mimeType}`);

  const init = await fetchJson('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: linkedinHeaders(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  });

  const uploadUrl = init.value.uploadUrl;
  const imageUrn = init.value.image;

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`LinkedIn image upload failed: ${putRes.status}`);

  return imageUrn;
}

async function uploadVideo(accessToken, author, url) {
  const { buffer, mimeType } = await downloadUrl(url);
  if (!isVideoMime(mimeType)) throw new Error(`LinkedIn video upload requires video, got ${mimeType}`);

  const init = await fetchJson('https://api.linkedin.com/rest/videos?action=initializeUpload', {
    method: 'POST',
    headers: linkedinHeaders(accessToken),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: author,
        fileSizeBytes: buffer.length,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });

  const videoUrn = init.value.video;
  const uploadInstructions = init.value.uploadInstructions || [];

  for (const part of uploadInstructions) {
    const start = part.firstByte;
    const end = part.lastByte;
    const chunk = buffer.subarray(start, end + 1);
    const putRes = await fetch(part.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: chunk,
    });
    if (!putRes.ok) throw new Error(`LinkedIn video part upload failed: ${putRes.status}`);
  }

  await fetchJson('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
    method: 'POST',
    headers: linkedinHeaders(accessToken),
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: init.value.uploadToken,
        uploadedPartIds: uploadInstructions.map((p) => p.uploadUrl),
      },
    }),
  });

  return videoUrn;
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  if (dryRun) return { platform_post_id: 'dry-run' };

  const token = await ensureAccessToken(tokenData, refreshToken);
  const author = token.author_urn;
  if (!author) throw new Error('Token missing author_urn');

  const body = { ...post.payload, author };

  if (post.media_urls?.length) {
    const url = post.media_urls[0];
    const head = await fetch(url, { method: 'HEAD' });
    const mime = head.headers.get('content-type')?.split(';')[0] || '';

    if (isVideoMime(mime)) {
      const videoUrn = await uploadVideo(token.access_token, author, url);
      body.content = { media: { id: videoUrn, title: post.id } };
    } else {
      const imageUrn = await uploadImage(token.access_token, author, url);
      body.content = { media: { id: imageUrn, title: post.id } };
    }
  }

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: linkedinHeaders(token.access_token),
    body: JSON.stringify(body),
  });

  const postId = res.headers.get('x-restli-id');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return { platform_post_id: postId || 'unknown' };
}