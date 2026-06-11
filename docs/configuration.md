# Configuration

## glits.config.js

Located at the **repo root**. Only one setting:

```javascript
export default {
  platforms: [
    'bluesky',
    'mastodon',
    'x',
    'threads',
    'instagram',
    'linkedin',
    'youtube',
    'facebook',
    'nostr',
  ],
};
```

| Behavior | Detail |
|----------|--------|
| `create` | Writes one queue file per listed platform |
| `send` | Only sends files whose `platform` is listed; others are skipped |
| Override | `--platforms bluesky,x` on `create` ignores config for that run |

Platform names must match keys in `cli/src/platforms/index.js`.

## Environment variables

Copy `.env.example` to `.env` at repo root. Both CLI and web read from this file (CLI via `dotenv`; web via Vercel env in production).

### Required (all setups)

| Variable | Used by | Description |
|----------|---------|-------------|
| `BLOB_READ_WRITE_TOKEN` | CLI + Web | Vercel Blob read/write token |

### Web OAuth

| Variable | Used by | Description |
|----------|---------|-------------|
| `OAUTH_REDIRECT_BASE` | Web | Public URL of deployed web app, e.g. `https://glits.vercel.app`. Falls back to `VERCEL_URL` or `http://localhost:5173` |

### Per-platform secrets

#### Bluesky

No env vars. User provides handle + app password on web form.

#### Mastodon

No env vars. Dynamic app registration per instance on connect.

#### X (Twitter)

| Variable | Used by | Description |
|----------|---------|-------------|
| `X_CLIENT_ID` | Web + CLI | OAuth 2.0 client ID |
| `X_CLIENT_SECRET` | Web + CLI | OAuth 2.0 client secret |

**Redirect URI:** `{OAUTH_REDIRECT_BASE}/auth/x/callback`

**Scopes:** `tweet.read tweet.write users.read offline.access media.write`

#### Meta (Instagram, Threads, Facebook)

| Variable | Used by | Description |
|----------|---------|-------------|
| `META_APP_ID` | Web | Facebook app ID |
| `META_APP_SECRET` | Web | Facebook app secret |

**Redirect URIs:**

- `{OAUTH_REDIRECT_BASE}/auth/instagram/callback`
- `{OAUTH_REDIRECT_BASE}/auth/threads/callback`
- `{OAUTH_REDIRECT_BASE}/auth/facebook/callback`

**Scopes:**

- Instagram: `instagram_business_basic,instagram_business_content_publish,pages_show_list`
- Threads: `threads_basic,threads_content_publish`
- Facebook: `pages_manage_posts,pages_read_engagement,pages_show_list`

Requires a Facebook Page (Instagram: Business account linked to Page).

#### YouTube

| Variable | Used by | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Web + CLI | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Web + CLI | Google OAuth client secret |

**Redirect URI:** `{OAUTH_REDIRECT_BASE}/auth/youtube/callback`

**Scope:** `https://www.googleapis.com/auth/youtube.upload`

#### LinkedIn

| Variable | Used by | Description |
|----------|---------|-------------|
| `LINKEDIN_CLIENT_ID` | Web + CLI | LinkedIn app client ID |
| `LINKEDIN_CLIENT_SECRET` | Web + CLI | LinkedIn app client secret |
| `LINKEDIN_VERSION` | CLI | Optional API version header (default: `202505`) |

**Redirect URI:** `{OAUTH_REDIRECT_BASE}/auth/linkedin/callback`

**Scopes:** `openid profile w_member_social`

#### Nostr

| Variable | Used by | Description |
|----------|---------|-------------|
| `NOSTR_BUNKER_NSEC` | Web | glits bunker private key (`nsec1...` or 64-char hex) |
| `NOSTR_RELAYS` | Web | Optional comma-separated relay URLs (defaults in code) |

Generate a **new** bunker key — do not reuse a personal identity key.

### CLI-only refresh secrets

These are needed at `send` time for token refresh (not needed on web-only deploy):

| Platform | Variables |
|----------|-----------|
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` |
| YouTube | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |

Meta and Mastodon tokens don't use CLI refresh in the same way (long-lived page tokens / static access tokens).

## OAuth app registration checklist

For each OAuth platform:

1. Create developer app in platform console
2. Add redirect URI exactly matching `{OAUTH_REDIRECT_BASE}/auth/{platform}/callback`
3. Copy client ID/secret to `.env` and Vercel env
4. Request required scopes (see above)
5. For Meta: connect Facebook Page, enable Instagram/Threads products
6. Deploy web, test connect flow
7. Enable platform in `glits.config.js`
8. Test `create` + `send`

## Local web development

```bash
npm run dev:web
# Visit http://localhost:5173
```

Set in `.env`:

```
OAUTH_REDIRECT_BASE=http://localhost:5173
```

Register `http://localhost:5173/auth/{platform}/callback` in each OAuth app (where supported).

## Vercel deployment env

Set all variables in Vercel project settings → Environment Variables. Minimum for auth:

```
BLOB_READ_WRITE_TOKEN
OAUTH_REDIRECT_BASE
META_APP_ID
META_APP_SECRET
X_CLIENT_ID
X_CLIENT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
NOSTR_BUNKER_NSEC
```

CLI secrets can live only on the machine running `send`.