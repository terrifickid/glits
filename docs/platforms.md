# Platforms reference

Each platform module implements `buildPost()` and `send()`. This document covers auth, media requirements, API behavior, and token fields.

## Summary table

| Platform | Auth | Text | Link | Image | Video | Token refresh at send |
|----------|------|------|------|-------|-------|----------------------|
| bluesky | App password | ✓ | ✓ appended | ✓ embed | — | Session resume |
| mastodon | OAuth | ✓ | ✓ appended | ✓ upload | ✓ upload | — |
| x | OAuth PKCE | ✓ | ✓ appended | ✓ upload | ✓ upload | ✓ |
| threads | Meta OAuth | ✓ | ✓ tag/append | ✓ container | ✓ container | — |
| instagram | Meta OAuth | ✓ caption | ✓ in caption | ✓ container | ✓ Reels | — |
| linkedin | OAuth | ✓ commentary | ✓ article | ✓ upload | ✓ upload | ✓ |
| youtube | Google OAuth | ✓ description | ✓ in description | — | ✓ required | ✓ |
| facebook | Meta OAuth | ✓ message | ✓ feed link | ✓ photo URL | — | — |
| nostr | NIP-46 bunker | ✓ | ✓ appended | ✓ imeta | ✓ imeta | — |

---

## Bluesky

**Module:** `cli/src/platforms/bluesky.js`

### Auth (web)

Form at `/auth/bluesky`: handle, app password, optional server (default `https://bsky.social`).

Uses `@atproto/api` `BskyAgent.login()`. Stores full `agent.session` + `service` in blob.

### buildPost

- Appends `--link` to text if not already present
- `media_urls` from image + video URLs (videos skipped at send if not image MIME)

### send

1. `agent.resumeSession(tokenData)`
2. HEAD each `media_urls` entry; upload images (max 4) as `app.bsky.embed.images`
3. `agent.post(record)`

### Requirements

- App password (not main account password)
- Image URLs must return `image/*` content-type on HEAD

---

## Mastodon

**Module:** `cli/src/platforms/mastodon.js`

### Auth (web)

Form at `/auth/mastodon`: instance URL (e.g. `mastodon.social`).

1. Dynamic app registration on instance (`/api/v1/apps`)
2. OAuth redirect to instance
3. Callback at `/auth/mastodon/callback`
4. Stores `access_token`, `instance`, account username

### buildPost

- `payload.status` = text (+ link)
- `payload.visibility` = `"public"`

### send

1. Download each media URL
2. POST `{instance}/api/v2/media` (multipart)
3. POST `{instance}/api/v1/statuses` with `media_ids[]`

### Requirements

- Instance must allow app registration
- Media uploaded from URL (not hotlinked)

---

## X (Twitter)

**Module:** `cli/src/platforms/x.js`

### Auth (web)

OAuth 2.0 PKCE at `/auth/x` → callback `/auth/x/callback`.

Stores `access_token`, `refresh_token`, `username`, expiry fields.

### buildPost

- `payload.text` with optional appended link

### send

1. Refresh token if expired (`api.x.com/2/oauth2/token`)
2. Upload media via `/2/media/upload` (category: `tweet_image` or `tweet_video`)
3. POST `/2/tweets` with `media.media_ids`

### Requirements

- `X_CLIENT_ID` + `X_CLIENT_SECRET` in CLI env for refresh
- Media upload API access on developer app

---

## Instagram

**Module:** `cli/src/platforms/instagram.js`  
**Shared:** `cli/src/lib/meta.js` (`sendMetaTwoStep`)

### Auth (web)

Meta OAuth at `/auth/instagram` → `/auth/instagram/callback`.

Resolves `ig_user_id` from Facebook Page's linked Instagram Business account.

### buildPost

- **Requires** `--image-url` or `--video-url`
- Video → `media_type: REELS`
- Image → `image_url` in payload

### send

Meta Graph two-step:

1. Create media container (`/{ig_user_id}/media`)
2. Poll until `status_code: FINISHED`
3. Publish (`/{ig_user_id}/media_publish`)

### Requirements

- Instagram Business/Creator account linked to Facebook Page
- Media must be at public URL (Graph fetches it)

---

## Threads

**Module:** `cli/src/platforms/threads.js`  
**Shared:** `cli/src/lib/meta.js`

### Auth (web)

Meta OAuth at `/auth/threads` → `/auth/threads/callback`.

Resolves `threads_user_id` from `graph.threads.net`.

### buildPost

- Video → `media_type: VIDEO`
- Image → `media_type: IMAGE`
- Text only → `media_type: TEXT` with optional `link_attachment`

### send

Threads Graph two-step:

1. Create (`/{threads_user_id}/threads`)
2. Poll container status
3. Publish (`/{threads_user_id}/threads_publish`) after 5s delay

---

## Facebook

**Module:** `cli/src/platforms/facebook.js`

### Auth (web)

Meta OAuth at `/auth/facebook` → `/auth/facebook/callback`.

Selects first Facebook Page; stores `page_id`, `page_access_token`.

### buildPost

- `payload.message` + optional `payload.link`

### send

- If image/media URL present → POST `/{page_id}/photos` with `url` + `caption`
- Else → POST `/{page_id}/feed` with `message` + `link`

### Requirements

- Facebook Page (not personal profile)
- Photo posts use URL parameter (Graph fetches image)

---

## LinkedIn

**Module:** `cli/src/platforms/linkedin.js`

### Auth (web)

OAuth at `/auth/linkedin` → `/auth/linkedin/callback`.

Fetches `userinfo`, stores `author_urn` as `urn:li:person:{sub}`.

### buildPost

- `payload.commentary` with REST post shape
- Link-only (no media) → `content.article` with source URL

### send

1. Refresh OAuth token if expired
2. If media: initialize upload (image or video REST API), PUT bytes, finalize video
3. POST `/rest/posts` with `author` + `content.media` or article

### Requirements

- `w_member_social` scope
- `LINKEDIN_VERSION` header (default `202505`)
- Post ID returned in `x-restli-id` response header

---

## YouTube

**Module:** `cli/src/platforms/youtube.js`

### Auth (web)

Google OAuth at `/auth/youtube` → `/auth/youtube/callback`.

Scope: `youtube.upload`. Stores tokens; account label from channel title.

### buildPost

- **Requires** `--video-url`
- `payload.snippet.title` = text or id
- `payload.snippet.description` = text + link
- `payload.status.privacyStatus` = `"public"`

### send

1. Refresh Google token if expired
2. Download video from URL
3. Resumable upload: init `uploadType=resumable`, PUT to location header

### Requirements

- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in CLI env
- Video must be downloadable from public URL

---

## Nostr

**Module:** `cli/src/platforms/nostr.js`  
**Web:** `web/src/lib/nostr/`

### Auth (web)

NIP-46 bunker flow at `/auth/nostr`:

1. glits generates a **dedicated posting keypair** (not user's main identity)
2. Shows `bunker://` URL with session secret
3. User connects via Nostr app (Amber, Primal, etc.)
4. glits bunker approves NIP-46 `connect`
5. Token saved with `delegated_nsec`, `user_pubkey`, `relays`

### buildPost

- Kind 1 text note
- Images/videos → `imeta` tags with URLs
- Link appended to content

### send

1. Decode `delegated_nsec` from token
2. `finalizeEvent()` with `nostr-tools`
3. Publish to token's `relays` (or defaults) via `SimplePool`

### Requirements

- `NOSTR_BUNKER_NSEC` for web bunker identity
- Posts appear as glits-managed `npub` (shown on connect page)
- Link posting key to main identity manually if desired (profile, NIP-05, etc.)

### Relay defaults

```
wss://relay.damus.io
wss://nos.lol
wss://relay.primal.net
```

Override with `NOSTR_RELAYS` env.

---

## Adding a new platform

1. Create `cli/src/platforms/newplatform.js` with `name`, `buildPost`, `send`
2. Register in `cli/src/platforms/index.js`
3. Add web auth routes under `web/src/routes/auth/newplatform/`
4. Add connect link in `web/src/routes/+page.svelte`
5. Document env vars in `.env.example`
6. Add to `glits.config.js` and this doc