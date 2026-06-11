---
name: glits
description: Queue and publish social posts to Bluesky, X, Mastodon, Instagram, Threads, LinkedIn, YouTube, Facebook, and Nostr from cloud asset URLs.
version: 1.0.0
author: glits
license: MIT
platforms: [macos, linux, windows]
metadata:
  hermes:
    tags: [social-media, publishing, marketing, automation]
    category: productivity
    requires_toolsets: [terminal]
required_environment_variables:
  - name: BLOB_READ_WRITE_TOKEN
    prompt: Vercel Blob read/write token
    help: Vercel dashboard → Storage → Blob
    required_for: publishing
---

# glits

Multi-platform social posting from public cloud URLs. CLI is bundled in this skill — no separate clone.

## Install

```bash
hermes skills install terrifickid/glits/glits
```

Put secrets in `~/.hermes/.env` (`BLOB_READ_WRITE_TOKEN`, OAuth refresh vars for X/YouTube/LinkedIn). Add them to `terminal.env_passthrough` in `~/.hermes/config.yaml`.

Connect accounts once via the glits web auth app (deployed from the same GitHub repo). Edit platforms in the installed skill's `glits.config.js` (`~/.hermes/skills/glits/glits.config.js`).

## Commands

`${HERMES_SKILL_DIR}/scripts/`:

| Action | Script |
|--------|--------|
| Create | `create.sh --id ID --text "..." [--link URL] [--image-url URL] [--video-url URL]` |
| List | `list.sh` |
| Send | `send.sh` |
| Retry | `send.sh --retry` |

## Procedure

1. Gather id, text, optional link, image/video URLs (public HTTPS)
2. `create.sh` then `send.sh`
3. Report results from queue JSON in `${HERMES_SKILL_DIR}/queue/`

## Pitfalls

- No tokens → user must connect accounts on web app first
- Instagram needs image/video; YouTube needs video
- Local files don't work — public URLs only