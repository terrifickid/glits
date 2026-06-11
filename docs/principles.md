# Design principles

glits is intentionally small. These principles govern every design decision.

## 1. Content is created elsewhere

glits does **not** generate images, videos, or copy. You produce assets in other tools (e.g. Grok Imagine, a CMS, a design tool) and pass **public cloud URLs** to the CLI.

The CLI's job is to **reference** those URLs in platform-specific payloads — not to upload, transcode, or generate media.

```
Your pipeline → public URLs → glits create → glits send → platforms
```

## 2. Queue files are the source of truth

Posts live as JSON files in a queue directory you choose (`--queue`). There is no database, no fixed `queue/` path in the repo, and no server-side post storage.

- **Portable** — copy, inspect, version, or delete queue files directly
- **Inspectable** — every post's status, errors, and per-account results are in the file
- **Replayable** — re-run `send --retry` on failed files

## 3. Authorize once, send many times

Users connect accounts on the **web app** (or paste credentials for Bluesky). Tokens are stored in **private Vercel Blob**. The CLI reads those tokens at send time.

There is no per-post user interaction. OAuth refresh (where applicable) happens automatically in the CLI.

## 4. Send hits every authorized account

Queue files do **not** include a `user_id`. When you `send`, glits posts to **every** token blob matching the platform suffix:

```
tokens/{account}-{platform}.json
```

If you have three X accounts connected, one `send` on an X queue file posts to all three. Partial failures are recorded per token in `results[]`.

## 5. Enable platforms one at a time

`glits.config.js` contains a `platforms` array. Only listed platforms are active for `create` and `send`. The recommended workflow is to enable one platform, verify auth + send, then add the next.

This keeps debugging manageable and avoids silent skips.

## 6. CLI and web are separate concerns

| Component | Responsibility |
|-----------|----------------|
| **CLI** | `create`, `list`, `send` — queue files and publishing |
| **Web** | Account authorization only — no posting, no queue management |

The web app does **not** need `glits.config.js`. Vercel hosts auth routes; your machine (or CI) runs the CLI.

## 7. Fail visibly, not silently

- Disabled platforms → `skip` with reason
- Missing tokens → `failed` with error message
- Per-account failures → `results[]` with per-token status
- Partial success → `failed` with `"Partial failure — some accounts failed"`

## 8. JavaScript, no over-engineering

- Plain JavaScript (ES modules)
- No TypeScript, no ORM, no job runner, no Redis
- Platform logic lives in `cli/src/platforms/{name}.js`
- Shared HTTP/OAuth/media helpers in `cli/src/lib/`

## Non-goals

glits explicitly does **not**:

- Schedule posts (use cron + `send`)
- Provide a dashboard or analytics
- Store or serve media
- Support multi-tenant user accounts on the web app
- Deduplicate or rate-limit across platforms
- Guarantee delivery to all relays or APIs (platform errors surface in queue files)

## Security model

- **Tokens** are full OAuth sessions or credentials, stored in **private** Vercel Blob
- **`.env`** holds `BLOB_READ_WRITE_TOKEN` and OAuth client secrets — never commit it
- **Web** runs on Vercel; only auth routes touch Blob write
- **CLI** needs `BLOB_READ_WRITE_TOKEN` read access for `send`
- **Nostr** uses a dedicated posting key authorized via NIP-46 — not the user's main `nsec`