# Web authentication

The SvelteKit web app (`web/`) handles **account authorization only**. It writes token JSON to private Vercel Blob. It does not read queue files or post content.

**Runtime:** Vercel serverless, Node.js 22.x (`adapter-vercel`).

## Home page

**Route:** `/`

Lists connect links for all platforms. Shows `?connected={platform}` or `?error={code}` query feedback after OAuth redirects.

## Shared libraries

| File | Purpose |
|------|---------|
| `lib/blob.js` | `saveToken()`, `loadToken()` via `@vercel/blob` |
| `lib/tokens.js` | `tokenPath(platform, account)` → `tokens/{account}-{platform}.json` |
| `lib/env.js` | `redirectBase()`, `mustEnv()` |
| `lib/oauth.js` | PKCE, `exchangeCode()`, `randomState()`, `fetchJson()` |
| `lib/auth/meta.js` | Meta OAuth URL, token exchange, IG/Threads/FB ID resolution |

## OAuth platforms (redirect flow)

Pattern for X, YouTube, LinkedIn, Instagram, Threads, Facebook:

1. **`/auth/{platform}`** (`+page.server.js` `load`)
   - Generate `state`, store in httpOnly cookie
   - Redirect to platform OAuth authorize URL

2. **`/auth/{platform}/callback`** (`+server.js` `GET`)
   - Validate `state` cookie
   - Exchange `code` for tokens
   - Fetch account identifier (username, page name, channel title, etc.)
   - `saveToken(tokenPath(platform, account), tokenData)`
   - Redirect to `/?connected={platform}`

### X

- PKCE: `x_pkce_verifier`, `x_oauth_state` cookies
- Token URL: `https://api.x.com/2/oauth2/token`
- Basic auth header with client credentials

### YouTube

- Cookie: `google_oauth_state`
- Fetches channel via `youtube/v3/channels?mine=true`

### LinkedIn

- Cookie: `linkedin_oauth_state`
- Fetches `api.linkedin.com/v2/userinfo`
- Sets `author_urn` on token

### Instagram / Threads / Facebook

- Meta OAuth via `lib/auth/meta.js`
- Short-lived token → long-lived token exchange
- Instagram: `getInstagramUserId()` from Page's `instagram_business_account`
- Threads: `getThreadsUserId()` from `graph.threads.net/me`
- Facebook: `getFacebookPage()` first Page from `/me/accounts`

Separate state cookies per Meta product:

- `meta_oauth_state_instagram`
- `meta_oauth_state_threads`
- `meta_oauth_state_facebook`

## Bluesky (form-based)

**Route:** `/auth/bluesky`

- `+page.svelte` — form: handle, app password, optional server
- `+page.server.js` — `actions.default`: `BskyAgent.login()`, save session to blob
- No redirect; shows inline success/error

## Mastodon (dynamic registration)

**Routes:**

- `/auth/mastodon` — instance URL form
- `/auth/mastodon/callback` — OAuth callback

**Flow:**

1. POST instance URL → register app on instance (`client_name: glits`)
2. Cookies: `mastodon_oauth_state`, `mastodon_instance`, `mastodon_client_id`, `mastodon_client_secret`
3. Redirect to `{instance}/oauth/authorize`
4. Callback exchanges code, verifies credentials, saves token as `{username}-{hostname}`

Redirect URI registered dynamically: `{redirectBase}/auth/mastodon/callback`

## Nostr (NIP-46 bunker)

**Routes:**

- `/auth/nostr` — shows bunker URL and posting `npub`
- `/auth/nostr/wait` — long-poll endpoint for connect completion

**Flow:**

1. `+page.server.js` `load`:
   - Generate session ID, connect secret, posting keypair
   - Save pending session to `nostr-pending/{sessionId}.json` in Blob
   - Return `bunker://{pubkey}?relay=...&secret=...` via `toBunkerURL()`

2. `+page.svelte`:
   - Display bunker URL for user to paste into Nostr app
   - Poll `/auth/nostr/wait?session=...` until connected

3. `wait/+server.js`:
   - Load pending session
   - Run `GlitsBunkerSession.waitForConnect()` (up to 55s, `maxDuration: 60`)
   - On NIP-46 `connect` approval, save `tokens/{pubkey-prefix}-nostr.json`
   - Return `{ ok: true }`

**Bunker implementation:** `lib/nostr/bunker-session.js`

Handles NIP-46 methods: `connect`, `ping`, `get_public_key`, `sign_event`, `switch_relays`.

**Token fields:**

```json
{
  "user_pubkey": "hex",
  "user_npub": "npub1...",
  "delegated_nsec": "nsec1...",
  "bunker_pubkey": "hex",
  "client_pubkey": "hex",
  "relays": ["wss://..."],
  "connected_at": "ISO8601",
  "auth": "nip46-bunker"
}
```

CLI `send` signs with `delegated_nsec` directly (authorized during connect).

## redirectBase resolution

```javascript
// lib/env.js
OAUTH_REDIRECT_BASE  →  stripped trailing slash
VERCEL_URL           →  https://{VERCEL_URL}
default              →  http://localhost:5173
```

Set `OAUTH_REDIRECT_BASE` explicitly in production.

## Cookie security

OAuth state cookies:

- `httpOnly: true`
- `sameSite: 'lax'`
- `maxAge: 600` (10 minutes)
- `path: '/'`

Deleted after successful callback.

## Error handling

Failed OAuth redirects to `/?error={platform}_auth_failed`.

Mastodon errors: `/auth/mastodon?error=state|token|missing_code`.

## What the web app does not do

- Read or write queue files
- Call platform posting APIs (except Bluesky login, Meta/LinkedIn userinfo during auth)
- Load `glits.config.js`
- Expose token contents to the browser (tokens stay server-side in Blob)