# Usage guide

## Prerequisites

1. Node.js 18+ and npm
2. A Vercel project with **Blob** storage enabled
3. `BLOB_READ_WRITE_TOKEN` in `.env` (root of repo)
4. Web app deployed (for OAuth platforms)
5. Platform developer apps registered (see [Configuration](./configuration.md))
6. Platforms enabled in `glits.config.js`

## Installation

```bash
git clone <repo>
cd glits
npm install
cp .env.example .env
# Edit .env
```

## Typical workflow

### Step 1: Deploy web and connect accounts

1. Deploy `web/` to Vercel
2. Set environment variables in Vercel dashboard (see [Configuration](./configuration.md))
3. Visit `https://your-app.vercel.app/`
4. Click **Connect** for each platform you use
5. Complete OAuth or credential flows

Tokens are saved to Vercel Blob automatically. You can connect multiple accounts per platform (each gets its own blob).

### Step 2: Enable platforms

Edit `glits.config.js` at repo root:

```javascript
export default {
  platforms: [
    'bluesky',
    // add more as you verify each one
  ],
};
```

**Recommendation:** enable one platform at a time, test `create` + `send`, then add the next.

### Step 3: Create queue files

Generate your image/video/text elsewhere, host at public URLs, then:

```bash
npm run cli -- create \
  --id campaign-2026-06-11 \
  --text "Check out our latest update" \
  --link "https://example.com/blog/post" \
  --image-url "https://cdn.example.com/hero.jpg" \
  --queue ./my-queue
```

#### Options

| Flag | Required | Description |
|------|----------|-------------|
| `--id <id>` | Yes | Unique post identifier; used in filenames |
| `--text <text>` | Yes | Post body / caption / title (platform-specific) |
| `--link <url>` | No | Website link appended or embedded per platform |
| `--image-url <url>` | No | Repeatable; public image URL |
| `--video-url <url>` | No | Repeatable; public video URL |
| `--platforms <list>` | No | Comma-separated override of `glits.config.js` |
| `--queue <dir>` | No | Queue directory (default: `./queue`) |

#### Examples

Text + link only (Mastodon, X, Threads, LinkedIn, Facebook, Nostr):

```bash
npm run cli -- create \
  --id note-001 \
  --text "Hello world" \
  --link "https://example.com" \
  --queue ./queue
```

Image post:

```bash
npm run cli -- create \
  --id photo-001 \
  --text "New product shot" \
  --image-url "https://cdn.example.com/product.jpg" \
  --queue ./queue
```

YouTube (video required):

```bash
npm run cli -- create \
  --id video-001 \
  --text "Launch day recap" \
  --video-url "https://cdn.example.com/launch.mp4" \
  --queue ./queue
```

Override platforms for a single create:

```bash
npm run cli -- create \
  --id test-x \
  --text "Test" \
  --platforms x \
  --queue ./queue
```

Output:

```
created ./queue/campaign-2026-06-11-bluesky.json
created ./queue/campaign-2026-06-11-mastodon.json
...
```

### Step 4: Inspect queue

```bash
npm run cli -- list --queue ./my-queue
```

Output:

```
campaign-2026-06-11-bluesky.json  bluesky  queued
campaign-2026-06-11-x.json        x        sent
```

### Step 5: Send

```bash
npm run cli -- send --queue ./my-queue
```

#### Send options

| Flag | Description |
|------|-------------|
| `--queue <dir>` | Queue directory (default: `./queue`) |
| `--retry` | Also attempt posts with `status: "failed"` |
| `--dry-run` | Validate tokens and flow without posting; status stays `queued` |

#### Example output

```
sent campaign-2026-06-11-bluesky.json → 2 account(s)
skip campaign-2026-06-11-x.json (sent)
fail campaign-2026-06-11-instagram.json: Partial failure — some accounts failed

done: 1 sent, 1 failed, 1 skipped
```

### Step 6: Handle failures

Open the failed queue file and inspect `results[]`:

```json
{
  "status": "failed",
  "error": "Partial failure — some accounts failed",
  "results": [
    { "token": "tokens/account1-instagram.json", "status": "sent", "platform_post_id": "123" },
    { "token": "tokens/account2-instagram.json", "status": "failed", "error": "Container ERROR" }
  ]
}
```

Fix the underlying issue (token expired, media URL unreachable, API quota), then:

```bash
npm run cli -- send --queue ./my-queue --retry
```

## Scheduling

glits has no built-in scheduler. Use cron, GitHub Actions, or any job runner:

```cron
# Every hour, send queued posts
0 * * * * cd /path/to/glits && npm run cli -- send --queue /path/to/queue
```

## CI/CD example

```yaml
# .github/workflows/send.yml
name: Send posts
on:
  workflow_dispatch:
jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run cli -- send --queue ./queue --retry
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
          X_CLIENT_ID: ${{ secrets.X_CLIENT_ID }}
          X_CLIENT_SECRET: ${{ secrets.X_CLIENT_SECRET }}
          # ... other refresh secrets per platform
```

## Direct CLI invocation

```bash
node cli/bin/glits.js create --id test --text "hi" --queue ./queue
node cli/bin/glits.js list --queue ./queue
node cli/bin/glits.js send --queue ./queue
```

Or via npm workspace:

```bash
npm run cli -- create --id test --text "hi" --queue ./queue
```

## What glits does not do in the CLI

- Upload local files (URLs must already be public)
- Generate images or text
- Pick which connected account to use (sends to **all**)
- Delete or edit posts on platforms
- Refresh tokens back to Blob (refresh is in-memory per send; re-auth on web if refresh fails)