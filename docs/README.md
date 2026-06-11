# glits documentation

**glits** is a social media publishing system: generate content elsewhere, queue posts from cloud URLs via a CLI, authorize accounts on a web app, and publish to every connected account per platform.

This documentation covers design principles, architecture, configuration, usage, and platform-specific behavior.

## Table of contents

| Document | Description |
|----------|-------------|
| [Hermes skill](./hermes-skill.md) | Install via `hermes skills tap add` + `hermes skills install` |
| [Principles](./principles.md) | Design philosophy, constraints, and non-goals |
| [Architecture](./architecture.md) | System components, data flow, and repo layout |
| [Usage](./usage.md) | End-to-end workflow and CLI commands |
| [Configuration](./configuration.md) | `glits.config.js`, environment variables, OAuth setup |
| [Queue and tokens](./queue-and-tokens.md) | Queue file schema, token storage, send semantics |
| [Platforms](./platforms.md) | Per-platform auth, payloads, and media requirements |
| [Web auth](./web-auth.md) | SvelteKit auth routes and connect flows |
| [Deployment](./deployment.md) | Local dev, Vercel, and operational notes |

## Quick start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with UPSTASH_KV_REST_API_URL / UPSTASH_KV_REST_API_TOKEN and platform OAuth secrets

# Enable platforms in glits.config.js (one at a time recommended)

# Deploy web to Vercel, connect accounts at /

# Create queue files
npm run cli -- create \
  --id my-post-001 \
  --text "Hello world" \
  --image-url "https://example.com/image.jpg" \
  --queue ./queue

# Publish
npm run cli -- send --queue ./queue
```

## Supported platforms

| Platform | Auth method | Text | Link | Image | Video |
|----------|-------------|------|------|-------|-------|
| Bluesky | App password | ✓ | ✓ | ✓ | — |
| Mastodon | OAuth (instance) | ✓ | ✓ | ✓ | ✓ |
| X | OAuth 2.0 PKCE | ✓ | ✓ | ✓ | ✓ |
| Threads | Meta OAuth | ✓ | ✓ | ✓ | ✓ |
| Instagram | Meta OAuth | ✓ | ✓ | ✓ | ✓ (Reels) |
| LinkedIn | OAuth 2.0 | ✓ | ✓ | ✓ | ✓ |
| YouTube | Google OAuth | — | ✓ | — | ✓ (required) |
| Facebook | Meta OAuth | ✓ | ✓ | ✓ | — |
| Nostr | NIP-46 bunker | ✓ | ✓ | ✓ | ✓ |

## Stack (locked)

- **JavaScript only** — no TypeScript
- **Node.js** CLI + **SvelteKit** web (auth only)
- **Upstash Redis** (via Vercel) for private token storage
- **Vercel** for web hosting (`adapter-vercel`, `nodejs22.x`)