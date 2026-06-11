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

Multi-platform social posting from public cloud URLs. The CLI is bundled inside this skill — **no separate clone or install** is needed.

## Core Architecture (READ THIS — AGENTS MUST UNDERSTAND)

There are **two separate pieces** that share only one secret:

1. **Web auth app** (deployed once from the `web/` directory in the glits repo to Vercel)
   - Users (or you on their behalf) go to the web UI and click "Connect" for each platform.
   - The web app performs OAuth (or credential) flows using the platform's client IDs/secrets.
   - On success it writes a **private token JSON blob** into Vercel Blob storage under the `tokens/` prefix.
   - Example blob keys: `tokens/alice.bsky.social-bluesky.json`, `tokens/myhandle-x.json`.
   - The web app also needs `BLOB_READ_WRITE_TOKEN` (to write) + all the `*_CLIENT_*` / `META_APP_*` / `NOSTR_*` secrets in its Vercel environment.

2. **This skill / CLI** (what you are running now)
   - Only ever **reads** tokens at send time.
   - Uses the exact same `BLOB_READ_WRITE_TOKEN` (from `~/.hermes/.env` + env passthrough) to call Vercel Blob `list({ prefix: 'tokens/' })` + fetch the matching ones.
   - The CLI **never** creates, edits, or deletes tokens. There is no "login", "connect", or "auth" subcommand.
   - `glits.config.js` (in the installed skill directory) only controls **which platforms are enabled for create/send** — it has nothing to do with whether tokens exist.

**Token storage is the single source of truth.** If `list` + filter in the CLI returns zero matches for a platform, `send` will fail with "No tokens found for platform: ...". The only remedy is to connect the account(s) via the web UI.

`oauth-token.js` inside the CLI is **only** internal refresh logic used by X, LinkedIn, and YouTube senders right before posting. It is not a user-facing command.

## Install

```bash
hermes skills install terrifickid/glits/glits
```

Hermes will prompt for the required `BLOB_READ_WRITE_TOKEN` on first use and store it in `~/.hermes/.env`. You must also ensure `~/.hermes/config.yaml` passes the token through for the terminal toolset (see docs/hermes-skill.md in the repo for the exact stanza).

## Config File — glits.config.js

**Where the file lives for this skill**

The CLI loads the config from the file next to the scripts inside the installed skill:

- Path: `${HERMES_SKILL_DIR}/glits.config.js`
- Conventional absolute location after `hermes skills install`: `~/.hermes/skills/glits/glits.config.js`

This is the **only** copy that matters for hermes users. Do not edit files in a source checkout unless you are maintaining the skill itself.

The wrapper script (`glits.sh`) automatically does:

```bash
export GLITS_CONFIG="${GLITS_CONFIG:-${ROOT}/glits.config.js}"
```

You can override the location by setting `GLITS_CONFIG=/some/other/file.js` before running the scripts, but for normal use just edit the one in the skill directory.

**Exact file format**

The file **must** be a valid ECMAScript module (`.js`) that does a default export of an object containing a `platforms` array.

Minimal valid example:

```js
export default {
  platforms: [
    'bluesky',
  ],
};
```

Full recommended template (with all platforms available, most commented out):

```js
// glits.config.js
// Controls which platforms create/send will act on.
// Must be `export default { platforms: [...] }` (ES module syntax).
// Use only the exact lowercase names listed below.

export default {
  platforms: [
    'bluesky',
    // 'mastodon',
    // 'x',
    // 'threads',
    // 'instagram',
    // 'linkedin',
    // 'youtube',
    // 'facebook',
    // 'nostr',
  ],
};
```

**Supported platform names (exact strings)**

| Name       | Platform       | Requirements / Notes                     |
|------------|----------------|------------------------------------------|
| `bluesky`  | Bluesky        | Text (+ optional link, image)            |
| `mastodon` | Mastodon       | Text (+ optional link, image/video)      |
| `x`        | X / Twitter    | Text (+ optional link, media)            |
| `threads`  | Threads        | Text (+ optional image)                  |
| `instagram`| Instagram      | **Image or video required**              |
| `linkedin` | LinkedIn       | Text (+ optional link, image/video)      |
| `youtube`  | YouTube        | **Video required**                       |
| `facebook` | Facebook Page  | Text (+ optional link, image/video)      |
| `nostr`    | Nostr          | Text (+ optional link, media)            |

- Names are case-sensitive and must be lowercase.
- Order in the array does not matter.
- JavaScript comments (`//` and `/* */`) are allowed and encouraged.
- The file is re-read on every `create` / `send` (no caching across processes).

**How the config affects commands**

- `create.sh` (no `--platforms` flag): Creates **one queue file per platform** listed in the array. Example: `my-post-123-bluesky.json`, `my-post-123-x.json`.
- `send.sh`: For every queue file, if its `platform` field is **not** present in the current `platforms` array, the file is skipped (logged as "platform disabled in config").
- `--platforms` override (create only): `create.sh --platforms bluesky,x --id ...` ignores the config file for that run and only creates files for the listed platforms. `send` will still apply the config file at send time (a queue file for a now-disabled platform will be skipped).
- Empty or missing `platforms` array → `create` will error with "No platforms enabled in glits.config.js".

**How an agent edits the config (via terminal / hermes)**

You have shell access. There is **no** `glits config edit` or similar subcommand — you edit the file directly with normal shell tools.

Recommended safe pattern (read → write clean version → verify):

```bash
# 1. Inspect current state
cat "${HERMES_SKILL_DIR}/glits.config.js"

# 2. Write the desired config (heredoc is reliable)
cat > "${HERMES_SKILL_DIR}/glits.config.js" << 'EOF'
export default {
  platforms: [
    'bluesky',
    // 'x',
    // 'mastodon',
    // 'threads',
    // 'instagram',
    // 'linkedin',
    // 'youtube',
    // 'facebook',
    // 'nostr',
  ],
};
EOF

# 3. Verify the write succeeded and is valid
cat "${HERMES_SKILL_DIR}/glits.config.js"

# 4. (Strongly recommended) Immediately check what tokens exist
#    for the platforms you just enabled
tokens.sh --json
```

Alternative editing techniques that work in the terminal environment:

- `sed -i 's|// '\''bluesky'\''|'\''bluesky'\''|' "${HERMES_SKILL_DIR}/glits.config.js"` (uncomment)
- `node -e ' ... fs.writeFileSync(...) '` for programmatic generation
- Any editor that the environment provides (`vi`, `nano`, etc.) if interactive use is allowed.

After editing, subsequent `create.sh` and `send.sh` (and `glits` invocations) will use the new list. No restart of anything is required.

**Best practice for agents**

- Always start by running `tokens.sh --json` to see what you actually have authorized tokens for.
- Only enable platforms in the config for which you have at least one working token (otherwise `send` will create failed queue entries).
- Keep most platforms commented out until the user has connected them on the web auth app. This prevents accidentally creating queue files for platforms that have no destination.
- If you use `--platforms` on create for a one-off, still keep the main config file in a sane state for normal `send` runs.

## Commands

All commands live in `${HERMES_SKILL_DIR}/scripts/` (the skill directory after install).

| Action          | Script                                      | Notes |
|-----------------|---------------------------------------------|-------|
| Create queue    | `create.sh --id ID --text "..." [--link URL] [--image-url URL] [--video-url URL] [--platforms list]` | Writes JSON files into the queue dir. Does **not** touch tokens or Blob. |
| List queue      | `list.sh`                                   | Shows the local queue files + their send status. |
| Send / publish  | `send.sh`                                   | For every queued post, loads **all** token blobs matching the post's platform, then calls the platform sender. Updates the queue JSON with per-token results. |
| Retry failed    | `send.sh --retry`                           | Re-attempts only posts with status `failed`. |
| **Inspect tokens** | `tokens.sh` or `tokens.sh --json`        | **New diagnostic command.** Lists every authorized account/token that exists in the Vercel Blob + a computed status (valid/expired/unknown) based on stored `expires_at` / `obtained_at`. **Safe — never prints secrets.** Use this first when an agent is unsure what accounts are available. |

Internally the scripts call `glits.sh <subcommand>` which runs the bundled Node CLI (`cli/bin/glits.js`). You can also invoke `glits tokens --json` directly if you cd into the skill's `cli/` after its npm deps are installed.

## How to Use (Typical Agent Flow)

1. **Before creating any posts**, run the tokens inspection command so you know exactly which accounts are available:

   ```bash
   tokens.sh
   # or for machine parsing:
   tokens.sh --json
   ```

   Example human output:
   ```
   Authorized tokens: 2

   - bluesky / alice.bsky.social   status=valid
       obtained_at: 2026-...
       pathname: tokens/alice.bsky.social-bluesky.json

   - x / myhandle   status=valid
       expires_at: 2026-...   expired=false
       has_refresh_token: true
       pathname: tokens/myhandle-x.json
   ```

2. If the platform you need has zero entries → tell the user: "You must connect that account in the glits web auth app first. The CLI cannot do OAuth."

3. Gather the post content + public HTTPS URLs for any media.

4. `create.sh ...` (optionally override `--platforms bluesky,x`)

5. `send.sh` (or `send.sh --dry-run` for validation only — still requires the tokens to exist).

6. Read the resulting queue JSON file(s) in `${HERMES_SKILL_DIR}/queue/` (or the dir you overrode via `GLITS_QUEUE`) and report the `results[]` array which contains per-token outcomes.

## Procedure

1. (Agent) `tokens.sh` (or `--json`) → confirm the desired platforms have at least one connected account.
2. Gather id, text, optional link, image/video public HTTPS URLs.
3. `create.sh` (with appropriate flags).
4. `send.sh`.
5. Report the final status + any `platform_post_id` values from the written queue file.

## Environment Variables

- **Only `BLOB_READ_WRITE_TOKEN`** is required by this skill/CLI. It is used exclusively for **reading** token blobs and is prompted by Hermes.
- All other secrets (`X_CLIENT_ID`, `META_APP_ID`, `GOOGLE_CLIENT_*`, `NOSTR_BUNKER_NSEC`, `OAUTH_REDIRECT_BASE`, etc.) are needed **only** by the web auth app (in its Vercel project settings) so that it can start the OAuth flows and exchange codes.
- The web app and the CLI must use the **exact same** Vercel Blob store / token if you want the tokens written by the web to be visible to `send`.

## Pitfalls & Agent Guidance (IMPORTANT)

- **"No tokens found for platform: X"** — This is the #1 error. Root cause is almost always "no matching `tokens/*-x.json` blob exists yet". The fix is **never** "run a tokens subcommand to create one". The fix is: connect the account in the deployed web UI.
- Do **not** invent CLI commands such as `glits auth`, `glits login`, `glits connect`, `glits tokens add`, `list tokens` as a subcommand of something else, etc. The only token-related command is the read-only `tokens` (via `tokens.sh` or `glits tokens`).
- Queue files are local to the skill dir (or `GLITS_QUEUE`). They are **not** stored in Blob.
- `create` works without any BLOB token or any connected accounts (it only writes local JSON). `send` is what requires the token + the blobs.
- Instagram and YouTube have strict media requirements (image/video respectively). The create step will still succeed; send will fail later.
- Local filesystem paths are never accepted — everything must be public HTTPS URLs that the platform APIs (and the CLI) can fetch.
- Refreshable tokens (X, LinkedIn, YouTube) store `refresh_token` + timestamps. The `tokens` command will surface `has_refresh_token` and `expired` status. If a refresh fails at send time the post for that account fails and the user usually has to re-connect on the web.
- Multiple accounts per platform are supported. One `send` on a platform posts to **every** token blob whose name ends with `-platform.json`. Use separate Blob stores or manually delete blobs in the Vercel dashboard if you need isolation.
- Edit the config using the exact location and agent editing pattern described in the "Config File" section above. Never edit a file outside the installed skill directory when running as a hermes user.

## New in this version: tokens inspection for agents

`tokens.sh` / `glits tokens` was added specifically so agents can discover the current set of authorized identities and their freshness **without** having to guess or ask the user to paste secrets. It is deliberately read-only and redacts everything sensitive. Prefer `--json` when you need to parse the result programmatically in your reasoning.

When a user (or you) asks "which accounts do I have connected?", the correct first action is to invoke `tokens.sh --json` (or the non-JSON form) and reason over the returned list.

## More information

Full documentation lives in the source repo under `docs/` (queue-and-tokens.md, hermes-skill.md, usage.md, platforms.md, etc.). The web auth flow is described in docs/web-auth.md.

When in doubt:
- Run `tokens.sh --json` first.
- If the needed platform is missing → direct the user to the web auth app.
- Only then proceed to `create.sh` + `send.sh`.
