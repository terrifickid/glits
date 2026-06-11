# Queue files and tokens

## Queue directory

The queue is a **directory of JSON files** you specify with `--queue`. Default: `./queue`.

- Not fixed in the repo — use any path
- Files named `{id}-{platform}.json`
- Created by `create`, updated by `send`
- Safe to gitignore (e.g. `queue/` or `my-queue/`)

## Queue file schema

### Common fields (all platforms)

```json
{
  "id": "my-post-001",
  "platform": "bluesky",
  "status": "queued",
  "created_at": "2026-06-11T12:00:00.000Z",
  "payload": { },
  "media_urls": ["https://cdn.example.com/image.jpg"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Post ID from `--id` |
| `platform` | string | Platform name |
| `status` | string | `queued`, `sent`, or `failed` |
| `created_at` | ISO 8601 | When `create` ran |
| `payload` | object | Platform-specific post body (unsigned) |
| `media_urls` | string[] | Optional; cloud URLs for media |

### Fields added by `send`

| Field | Type | When present |
|-------|------|--------------|
| `last_attempt_at` | ISO 8601 | After send attempt |
| `sent_at` | ISO 8601 | On full success |
| `error` | string \| null | On failure |
| `platform_post_id` | string | First successful result's ID |
| `results` | array | Per-token outcomes |

### Status lifecycle

```
create → queued
send (success) → sent
send (failure) → failed
send --retry (from failed) → sent | failed
send --dry-run → queued (unchanged)
```

Skipped files (disabled platform, already `sent`) are not modified.

### results[] schema

```json
{
  "results": [
    {
      "token": "tokens/alice.bsky.social-bluesky.json",
      "status": "sent",
      "platform_post_id": "at://did:plc:.../app.bsky.feed.post/..."
    },
    {
      "token": "tokens/bob.bsky.social-bluesky.json",
      "status": "failed",
      "error": "Invalid token"
    }
  ]
}
```

| `status` | Meaning |
|----------|---------|
| `sent` | Posted successfully |
| `failed` | Error in `error` field |
| `dry-run` | `--dry-run` mode; no API call |

### Partial failure

If any token fails but at least one succeeds:

- `status`: `"failed"`
- `error`: `"Partial failure — some accounts failed"`
- `results[]` has mixed `sent` and `failed` entries

Re-run with `--retry` to attempt failed accounts again (already-sent accounts will succeed again unless platform deduplicates — glits does not deduplicate).

## payload field

Platform-specific structure built by `buildPost()`. Examples:

**Bluesky:**

```json
{
  "payload": {
    "$type": "app.bsky.feed.post",
    "text": "Hello https://example.com",
    "createdAt": "2026-06-11T12:00:00.000Z"
  }
}
```

**X:**

```json
{
  "payload": {
    "text": "Hello https://example.com"
  }
}
```

**Nostr:**

```json
{
  "payload": {
    "kind": 1,
    "content": "Hello https://example.com",
    "tags": [["imeta", "url https://cdn.example.com/img.jpg"]]
  }
}
```

See [Platforms](./platforms.md) for full per-platform payload details.

## Token storage (Upstash Redis)

### Path convention (Redis keys)

```
tokens/{account}-{platform}.json
```

Examples:

```
tokens/alice.bsky.social-bluesky.json
tokens/mybrand-instagram.json
tokens/abc123def456-nostr.json
```

`account` is sanitized: `[^a-zA-Z0-9.-]` → `_`.

### How CLI finds tokens

1. `redis.keys('tokens/*')` — all token keys (or SCAN for very large sets)
2. Filter where key ends with `-{platform}.json`
3. For each match: `redis.get(key)` → JSON.parse

Values are stored as JSON strings (no separate metadata objects).

### How web writes tokens

```javascript
await redis.set(pathname, JSON.stringify(data));
```

### Multi-account behavior

No `user_id` in queue files. `send` iterates **all** tokens for `post.platform`.

To post to one account only: disconnect other accounts on web (delete their key in Upstash console Data browser) or use a separate Redis database.

### Token contents (by platform)

Tokens store whatever each platform's `send()` needs. Common patterns:

| Platform | Key fields in token blob |
|----------|--------------------------|
| Bluesky | `accessJwt`, `refreshJwt`, `handle`, `did`, `service` |
| Mastodon | `access_token`, `instance` |
| X | `access_token`, `refresh_token`, `expires_at`, `username` |
| Instagram | `access_token`, `ig_user_id`, `page_id` |
| Threads | `access_token`, `threads_user_id` |
| Facebook | `page_id`, `page_access_token` |
| LinkedIn | `access_token`, `refresh_token`, `author_urn` |
| YouTube | `access_token`, `refresh_token`, `expires_at` |
| Nostr | `delegated_nsec`, `user_pubkey`, `relays`, `auth` |

OAuth tokens include `obtained_at` and often `expires_at` for refresh logic in `cli/src/lib/oauth-token.js`.

## Security notes

- Tokens are **private** blobs — not publicly accessible
- The `UPSTASH_KV_*` (or fallback) token grants full access to the Redis instance — protect it
- Bluesky stores session JWTs; Nostr stores delegated `nsec`
- Rotating OAuth: re-connect on web; old blob is overwritten (`allowOverwrite: true`)