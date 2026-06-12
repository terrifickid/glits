# glits

Queue and publish social posts to Bluesky, X (Twitter), Mastodon, Instagram, Threads, LinkedIn, YouTube, Facebook, and Nostr — all from public cloud asset URLs.

One CLI. One config. Multiple platforms.

## Installation

```bash
npm install -g glits
```

Use via npx (no global install needed):

```bash
npx glits --help
```

## Basic usage

1. Create a `glits.config.js` (must be an ES module):

```js
// glits.config.js
export default {
  platforms: [
    'bluesky',
    // 'x',
    // 'mastodon',
    // 'instagram',
    // 'threads',
    // 'linkedin',
    // 'youtube',
    // 'facebook',
    // 'nostr',
  ],
};
```

2. Make sure your environment has the required credentials (see below).

3. Create queue files and send:

```bash
# Inspect what accounts are connected (safe, read-only)
glits --config glits.config.js tokens --json

# Create posts for the enabled platforms
glits --config glits.config.js create \
  --id campaign-2026-06-12 \
  --text "Check this out https://example.com" \
  --image-url https://cdn.example.com/hero.jpg \
  --queue ./queue

# Publish everything queued
glits --config glits.config.js send --queue ./queue
```

Other useful commands:

```bash
glits --config glits.config.js list --queue ./queue
glits --config glits.config.js send --queue ./queue --retry
glits --config glits.config.js send --queue ./queue --dry-run
```

You can override platforms for a single `create`:

```bash
glits --config glits.config.js create --id test --text "hi" --platforms bluesky,x --queue ./queue
```

## Configuration

The `glits.config.js` file controls which platforms are active.

- It must do `export default { platforms: [...] }`.
- Only exact lowercase platform names are allowed.
- The file is re-read on every run (no caching).

See the example in the source repo if you want a full commented template.

## Token storage & account connections

**This CLI does not do authentication.**

Tokens are stored in Upstash Redis (under `tokens/*-platform.json` keys). They are **written** by a separate web application:

- The web app lives in the `glits-web` directory of the repo.
- Deploy it once to Vercel.
- Users (or you) visit the web UI and click **Connect** for each platform.
- After that, this CLI can read the tokens and post on their behalf.

If `tokens --json` shows no accounts for a platform, the fix is to connect via the web app — there are no `glits auth` / `glits login` commands.

## Environment variables

### Required for most operations

- `UPSTASH_KV_REST_API_URL`
- `UPSTASH_KV_REST_API_TOKEN`

(These come from a Vercel Upstash integration or your Upstash console. They are also what the web app uses.)

### Needed at send time for token refresh

Some platforms use short-lived tokens that the CLI refreshes:

- X: `X_CLIENT_ID`, `X_CLIENT_SECRET`
- YouTube: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

Other platforms (Bluesky app passwords, Mastodon, Instagram/Threads/Facebook page tokens, Nostr bunker) generally do not need extra client secrets in the CLI environment.

## Hermes (agent) usage

A minimal `glits-skill` is provided in the repo for Hermes.

Agents typically run commands like:

```bash
npx glits --config /path/to/config.js tokens --json
npx glits --config /path/to/config.js create --id ... --text "..." --queue ...
npx glits --config /path/to/config.js send --queue ...
```

See `glits-skill/SKILL.md` for the full agent-oriented instructions.

## Platform notes (quick)

- **Instagram / YouTube**: Strict media requirements (image or video respectively).
- **All platforms**: Only public HTTPS URLs are accepted for media and links. No local file paths.
- Multiple accounts per platform are supported — one `send` posts to all connected accounts for that platform.

## Development / from source

```bash
git clone https://github.com/terrifickid/glits.git
cd glits/glits          # the CLI package
npm install
node bin/glits.js --help
```

The other two packages in the repo (`glits-skill` and `glits-web`) are independent.

## License

MIT

---

For full details on the web auth flow, platform-specific behavior, and advanced usage, see the source repository: https://github.com/terrifickid/glits
