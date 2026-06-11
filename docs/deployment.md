# Deployment

## Overview

| Component | Where | How |
|-----------|-------|-----|
| Web (auth) | Vercel | `npm run build:web` via adapter-vercel |
| CLI | Local / CI / cron | `node cli/bin/glits.js` |
| Tokens | Vercel Blob | Private JSON blobs |
| Queue | Filesystem | Any path via `--queue` |

## Web: Vercel deployment

### 1. Create Vercel project

Connect Git repo. Set root directory to repo root (monorepo). Build command:

```bash
npm run build:web
```

Output is handled by `@sveltejs/adapter-vercel`.

### 2. Enable Vercel Blob

In Vercel dashboard → Storage → Blob. Create store. Copy `BLOB_READ_WRITE_TOKEN`.

### 3. Environment variables

Set for Production (and Preview if testing OAuth):

```
BLOB_READ_WRITE_TOKEN
OAUTH_REDIRECT_BASE=https://your-project.vercel.app
X_CLIENT_ID
X_CLIENT_SECRET
META_APP_ID
META_APP_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
NOSTR_BUNKER_NSEC
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net
```

### 4. Register OAuth redirect URIs

In each platform developer console, add:

```
https://your-project.vercel.app/auth/bluesky          (no callback — form only)
https://your-project.vercel.app/auth/mastodon/callback
https://your-project.vercel.app/auth/x/callback
https://your-project.vercel.app/auth/youtube/callback
https://your-project.vercel.app/auth/linkedin/callback
https://your-project.vercel.app/auth/instagram/callback
https://your-project.vercel.app/auth/threads/callback
https://your-project.vercel.app/auth/facebook/callback
```

Mastodon instances receive redirect URI at app registration time (automatic).

### 5. Deploy and test

1. Visit `/` — all connect links visible
2. Connect one platform
3. Verify blob appears in Vercel Blob dashboard: `tokens/...`
4. Run CLI `send` from local machine with same `BLOB_READ_WRITE_TOKEN`

## CLI: local and CI

### Local `.env`

At repo root:

```
BLOB_READ_WRITE_TOKEN=...
X_CLIENT_ID=...          # for X send refresh
X_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...     # for YouTube send refresh
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

CLI does not need web OAuth secrets for Meta/Mastodon/Bluesky/Nostr at send time (with exceptions noted in [Platforms](./platforms.md)).

### Cron example

```bash
#!/bin/bash
cd /path/to/glits
export $(grep -v '^#' .env | xargs)
npm run cli -- send --queue /var/glits-queue --retry >> /var/log/glits-send.log 2>&1
```

### GitHub Actions

See [Usage](./usage.md#cicd-example).

## Local web development

```bash
npm install
npm run dev:web
# http://localhost:5173
```

`.env`:

```
BLOB_READ_WRITE_TOKEN=...
OAUTH_REDIRECT_BASE=http://localhost:5173
# ... platform secrets
```

OAuth apps must allow `http://localhost:5173/auth/*/callback` where the platform supports localhost redirects.

## Build verification

```bash
npm install
npm run build:web
```

Smoke test CLI:

```bash
npm run cli -- create --id test --text "hello" --platforms bluesky --queue /tmp/queue
npm run cli -- list --queue /tmp/queue
```

## Runtime limits (Vercel)

- **Nostr wait endpoint:** `maxDuration: 60` seconds
- Client polls every ~55s until connect or error
- Other auth routes complete in single request/redirect

## Blob access model

- **Web:** write tokens (`put`)
- **CLI:** list + read tokens (`list`, `head`, fetch)
- Same `BLOB_READ_WRITE_TOKEN` for both
- Tokens are `access: 'private'`

## Troubleshooting

| Symptom | Check |
|---------|-------|
| OAuth redirect mismatch | `OAUTH_REDIRECT_BASE` matches registered URI exactly |
| `No tokens found for platform` | Blob empty or wrong platform suffix; re-connect on web |
| `Missing env: X_CLIENT_ID` | Web env vars set in Vercel |
| Send refresh fails | CLI `.env` has client ID/secret for X/YouTube/LinkedIn |
| Instagram `No Business account` | Facebook Page linked to IG Business account |
| Nostr connect timeout | User pasted bunker URL in app; relays reachable; `NOSTR_BUNKER_NSEC` set |
| Partial failure | Inspect `results[]` in queue file per token |
| Platform skipped | Not in `glits.config.js` platforms array |

## Upgrades and maintenance

- **Enable new platform:** add to config, connect on web, test create/send
- **Rotate OAuth secrets:** update Vercel + local `.env`, users re-connect
- **Rotate Nostr bunker:** generate new `NOSTR_BUNKER_NSEC`, users re-connect Nostr
- **npm updates:** `npm update` in repo root (workspaces)

## Security checklist

- [ ] `.env` in `.gitignore`
- [ ] `BLOB_READ_WRITE_TOKEN` only on Vercel + trusted CLI runners
- [ ] OAuth apps use minimal required scopes
- [ ] `OAUTH_REDIRECT_BASE` is HTTPS in production
- [ ] Bluesky uses app passwords, not main passwords
- [ ] Nostr uses dedicated posting key, not main `nsec`