---
name: glits
description: Queue and publish social posts to Bluesky, X, Mastodon, Instagram, Threads, LinkedIn, YouTube, Facebook, and Nostr from cloud asset URLs.
version: 2.0.0
author: glits
license: MIT
platforms: [macos, linux, windows]
metadata:
  hermes:
    tags: [social-media, publishing, marketing, automation]
    category: productivity
    requires_toolsets: [terminal]
required_environment_variables:
  - name: KV_REST_API_URL
    prompt: Vercel KV REST URL (the canonical default from the integration)
    help: This is the single canonical URL variable.
    required_for: publishing
  - name: KV_REST_API_READ_ONLY_TOKEN
    prompt: Vercel KV REST read-only token (the canonical default for read-only use)
    help: This is the single canonical token variable for the glits CLI / this skill. The web app uses the full KV_REST_API_TOKEN instead.
    required_for: publishing
---

# glits

Multi-platform social posting from public cloud URLs.

**This skill only reads tokens and publishes.** There is a completely separate web app (glits-web) that does the OAuth/account connections and writes the private tokens into the store. The CLI (what you run here) never does auth.

## Human prerequisites (tell the user)

- Node.js 18+ must be available in the environment where the Hermes terminal tool runs.
- The human must run (once): `npm install -g glits` (or be willing to let you use `npx glits`).
- The separate `glits-web` must have been deployed to Vercel at least once, and the user must have used it to **Connect** the accounts they want to post to.
- KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN (injected by this skill's frontmatter).

If you ever see "command not found: glits", immediately tell the human:

> Run `npm install -g glits` (or ensure `node` + `npm` are on the PATH that the Hermes terminal uses) and try again.

## Always start here: inspect tokens

```bash
npx glits --config /tmp/my.config.js tokens --json
# or after global install:
glits --config /tmp/my.config.js tokens --json
```

This is read-only and safe. It tells you exactly which accounts exist in the token store for each platform and whether they look fresh.

If the platform you need has zero entries → stop and tell the user they must connect the account(s) in the deployed glits-web app. The CLI cannot create tokens.

## Config (platforms enabled)

You control which platforms are active by pointing at a config file with `--config`. The file is a tiny ES module.

Example (write this to any path you control, e.g. /tmp/my.config.js):

```js
export default {
  platforms: [
    'bluesky',
    // 'x',
    // 'mastodon',
    // add only platforms that already have connected accounts
  ],
};
```

Use it on every command:

```bash
npx glits --config /tmp/my.config.js ...
```

(See glits-skill/glits.config.example.js next to this SKILL.md for a copyable version.)

## Typical agent flow

1. Write a small config for the platforms you actually have tokens for.
2. `npx glits --config ... tokens --json` → confirm the accounts.
3. Gather the post: `--id`, `--text`, optional `--link`, `--image-url`, `--video-url` (public HTTPS only).
4. Create queue file(s):

   ```bash
   npx glits --config /tmp/my.config.js \
     create --id my-post-001 --text "Hello world https://example.com" \
     --image-url https://cdn.example.com/photo.jpg \
     --queue /tmp/glits-queue
   ```

5. Send (requires the KV_REST_API_* credentials in the env):

   ```bash
   npx glits --config /tmp/my.config.js \
     send --queue /tmp/glits-queue
   ```

6. Read the resulting JSON file(s) under the `--queue` dir you chose and report the `results[]` array (per-token status + platform_post_id on success).

Use `--retry` on send to re-attempt only failed ones.

Use `--dry-run` on send for validation without posting.

## Commands (the ones you actually type)

All via the published package (no wrappers in this skill):

- `npx glits --config <file> tokens --json`
- `npx glits --config <file> create --id <id> --text "..." [--link ...] [--image-url ...] [--video-url ...] [--platforms ...] --queue <dir>`
- `npx glits --config <file> list --queue <dir>`
- `npx glits --config <file> send --queue <dir> [--retry] [--dry-run]`

You always control `--queue` and `--config`. Choose paths the terminal can read/write (e.g. under /tmp or a volume the agent has access to).

## Important pitfalls

- "No tokens found for platform: X" almost always means no matching token was ever written by the web app for that platform. Fix: connect via glits-web.
- The CLI never logs in, never does OAuth, never writes tokens.
- Instagram requires an image or video. YouTube requires a video. Create will succeed; send will fail later if missing.
- Only public HTTPS URLs for assets. No local paths.
- Refreshable platforms (x, linkedin, youtube) need their client secrets in the terminal environment at send time (in addition to the KV_REST_API_* creds declared in this frontmatter).
- Queue files live only where you told `--queue`. They are not in the token store.

## Mental model (agents must understand)

Two independent pieces that share only the token store:

- glits-web (deployed once by a human to Vercel) → performs connects, writes private token blobs.
- This skill + the `glits` CLI (what you invoke with npx or global) → only reads tokens at send time and publishes.

The web piece is **not** part of this skill. It lives in the separate `glits-web` directory/package.

When in doubt: run `tokens --json` first, then create + send, then read the queue JSON you produced.

Full details for the `glits` package (flags, platform specifics, CI examples) live in the package on npm. Use `npx glits --help` and the package README when you need the exhaustive flag list.
