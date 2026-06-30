# AGENTS.md

## Repo layout

Loose monorepo — no root `package.json`, no workspace tooling, no shared `node_modules`:

- `glits/` — published CLI (`glits` on npm). Node >= 18. Commands: `create`, `list`, `send`, `tokens`.
- `glits-web/` — private SvelteKit web app deployed to Vercel for OAuth account connections. Node 22.x runtime (set in `svelte.config.js`).
- `glits-skill/` — static skill definition for Hermes AI agent platform. Not a package.

The three packages do **not** import from each other. Their only shared dependency is the token store (Upstash Redis / Vercel KV). The web app **writes** tokens; the CLI **reads** them.

## Commands

### Web app (`glits-web/`)
```
npm run dev       # vite dev (SvelteKit)
npm run build     # vite build
npm run preview   # vite preview
```
No test, lint, or format scripts exist.

### CLI (`glits/`)
No npm scripts at all. Run directly:
```
node bin/glits.js --config <path> <command> ...
```
Or via npm install:
```
npx glits --config <path> <command> ...
```

## Config resolution (CLI)

The `--config` flag is handled in **two** places:
1. `bin/glits.js` line 110: a `preAction` hook sets `process.env.GLITS_CONFIG` from the `--config` option value.
2. `src/config.js` lines 8–9: **also** reads `--config` directly from `process.argv` as a fallback.

Precedence: `--config` flag > `GLITS_CONFIG` env var > `./glits.config.js` in CWD.

Config is a tiny ES module exporting `{ platforms: ['bluesky', ...] }`. See `glits.config.js` at repo root for example.

## Important gotchas

- **No tests anywhere.** No test runner, no test files, no CI. Verify changes manually.
- **Duplicate code**: `oauth1.js` exists independently in both `glits/src/lib/` and `glits-web/src/lib/`. Changes to OAuth 1.0a signing must be synced manually between both copies.
- **ES modules only** — all packages use `"type": "module"`. `import`/`export` syntax throughout.
- **dotenv loaded once** at the top of `bin/glits.js` (line 3). The CLI entrypoint is the only place that loads `.env` — library code assumes env vars are already available.
- **Queue files** are plain JSON on disk (`--queue` directory), keyed as `{id}-{platform}.json`. State transitions: `queued` → `sent` | `failed`. `--retry` re-attempts only failed posts.
- **Instagram requires** an image or video. **YouTube requires** video. `create` succeeds regardless; `send` will fail later if media is missing.
- **Only public HTTPS URLs** for media assets. No local file paths.
- **Refreshable OAuth tokens** (X, LinkedIn, YouTube) need their client secrets (`*_CLIENT_ID` / `*_CLIENT_SECRET`) in the environment at send time, not just KV creds.
- **KV token store keys**: `tokens/{user}-{platform}.json` format, stored in Upstash Redis.
- The web app uses SvelteKit's `$env/dynamic/private` for env vars, **not** `dotenv`. See `glits-web/src/lib/env.js` for helpers like `redirectBase` and `mustEnv`.
