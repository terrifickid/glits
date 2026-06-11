# Architecture

## High-level overview

```mermaid
flowchart LR
  subgraph external [External]
    Assets[Cloud asset URLs]
    OAuth[Platform OAuth APIs]
    Relays[Nostr relays]
  end

  subgraph cli [CLI - local or CI]
    Create[create]
    List[list]
    Send[send]
    Platforms[platform modules]
  end

  subgraph storage [Storage]
    Queue[Queue directory JSON files]
    Store[(Upstash Redis / token keys)]
  end

  subgraph web [Web - Vercel]
    Auth[/auth routes]
  end

  Assets --> Create
  Create --> Queue
  Send --> Queue
  Send --> Store
  Send --> Platforms
  Platforms --> OAuth
  Platforms --> Relays
  Auth --> Blob
  List --> Queue
```

## Monorepo layout

```
glits/
├── glits.config.js          # platforms array only
├── package.json             # npm workspaces: cli, web
├── .env                     # secrets (not committed)
├── .env.example
├── docs/                    # this documentation
│
├── cli/
│   ├── bin/glits.js         # entry: dotenv, commander, lazy send import
│   └── src/
│       ├── commands/
│       │   ├── create.js    # build queue files per platform
│       │   ├── list.js      # list queue status
│       │   └── send.js      # publish to all tokens per platform
│       ├── platforms/       # one module per platform
│       │   ├── index.js     # getPlatform(name)
│       │   ├── bluesky.js
│       │   ├── mastodon.js
│       │   ├── x.js
│       │   ├── threads.js
│       │   ├── instagram.js
│       │   ├── linkedin.js
│       │   ├── youtube.js
│       │   ├── facebook.js
│       │   └── nostr.js
│       ├── lib/             # shared CLI utilities
│       │   ├── http.js
│       │   ├── media.js
│       │   ├── meta.js      # Instagram/Threads Graph helpers
│       │   ├── oauth-token.js
│       │   └── nostr.js
│       ├── config.js        # loads ../../glits.config.js
│       ├── queue.js         # filesystem queue I/O
│       └── tokens.js        # Upstash Redis token read
│
└── web/
    └── src/
        ├── lib/
        │   ├── blob.js      # saveToken, loadToken
        │   ├── tokens.js    # tokenPath(platform, account)
        │   ├── env.js       # redirectBase, mustEnv
        │   ├── oauth.js     # PKCE, exchangeCode, fetchJson
        │   ├── auth/meta.js # Meta Graph OAuth helpers
        │   └── nostr/       # NIP-46 bunker session
        └── routes/
            ├── +page.svelte           # home: connect links
            └── auth/
                ├── bluesky/           # app password form
                ├── mastodon/          # dynamic app registration
                ├── x/                 # OAuth redirect
                ├── youtube/
                ├── linkedin/
                ├── instagram/
                ├── threads/
                ├── facebook/
                └── nostr/             # NIP-46 bunker connect
```

## Component responsibilities

### CLI (`cli/`)

| Module | Role |
|--------|------|
| `bin/glits.js` | Commander setup; `send` is lazy-imported so `create`/`list` don't load `@upstash/redis` |
| `config.js` | Loads and caches `glits.config.js` from repo root |
| `queue.js` | Read/write JSON files in `--queue` directory |
| `tokens.js` | `redis.keys('tokens/*')` → `redis.get(key)` + parse |
| `commands/create.js` | Calls `platform.buildPost()` for each enabled platform |
| `commands/send.js` | Loads tokens, calls `platform.send()` per token, updates queue file |
| `platforms/*.js` | `buildPost(opts)` + `send(post, tokenData, opts)` |

### Web (`web/`)

| Route | Role |
|-------|------|
| `/` | Links to all platform connect pages |
| `/auth/{platform}` | Initiates OAuth or shows connect form |
| `/auth/{platform}/callback` | OAuth callback (or Mastodon/Nostr wait endpoints) |

Web writes tokens via `saveToken()` → Upstash Redis `set()` (JSON string values).

### Shared token path convention

Both web and CLI use the same key naming:

```
tokens/{safeAccount}-{platform}.json
```

`safeAccount` = account identifier with non-alphanumeric chars replaced by `_`.

Platform is parsed from the **last** `-` segment before `.json`:

```
tokens/jane.doe-x.json        → platform: x
tokens/my-page-facebook.json → platform: facebook
```

## Data flow: create → send

### 1. Create

```
glits create --id POST --text "..." --image-url URL --queue ./queue
```

1. Load enabled platforms from `glits.config.js` (or `--platforms` override)
2. For each platform, call `buildPost({ id, text, link, imageUrls, videoUrls })`
3. Write `{id}-{platform}.json` to queue directory

Each platform module decides payload shape and media requirements (e.g. YouTube requires `--video-url`).

### 2. Send

```
glits send --queue ./queue [--retry] [--dry-run]
```

1. List all `.json` files in queue directory
2. For each file:
   - Skip if platform disabled in config
   - Skip if status not `queued` (or `failed` with `--retry`)
   - `getTokensForPlatform(post.platform)` from Blob
   - For **each** matching token, call `platform.send(post, token.data)`
   - Write `results[]`, update `status`, `sent_at`, `error`
3. Print summary: sent / failed / skipped

### 3. Lazy blob loading

`send` is dynamically imported in `bin/glits.js`:

```javascript
.action(async (opts) => {
  const { sendCommand } = await import('../src/commands/send.js');
  return sendCommand(opts);
});
```

This keeps `create` and `list` free of the token store (redis) dependency at startup (useful when credentials aren't set during local queue file creation).

## Platform module contract

Every platform exports:

```javascript
export const name = 'platformname';

export function buildPost(opts) {
  // opts: { id, text, link, imageUrls, videoUrls }
  // returns queue file object
}

export async function send(post, tokenData, { dryRun = false } = {}) {
  // returns { platform_post_id }
}
```

Queue file objects share a common shape (see [Queue and tokens](./queue-and-tokens.md)).

## External dependencies

### CLI

| Package | Use |
|---------|-----|
| `commander` | CLI parsing |
| `dotenv` | Load `.env` at startup |
| `@vercel/blob` | Token list/read |
| `@atproto/api` | Bluesky |
| `nostr-tools` | Nostr sign/publish |

### Web

| Package | Use |
|---------|-----|
| `@sveltejs/kit` | Framework |
| `@sveltejs/adapter-vercel` | Deployment |
| `@vercel/blob` | Token write |
| `@atproto/api` | Bluesky login |
| `nostr-tools` | NIP-46 bunker |

## Runtime environments

| Component | Where it runs | Node version |
|-----------|---------------|--------------|
| CLI | Developer machine, CI, cron | Node 18+ |
| Web | Vercel serverless | `nodejs22.x` |

The web app has no persistent processes. Long-polling (Nostr connect) uses serverless `maxDuration: 60` with client-side retry.