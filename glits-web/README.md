# glits-web

The separate Vercel web app that performs account connections (OAuth / app passwords / bunker) and writes private token blobs into the shared token store.

This package is **not** part of the Hermes skill or the CLI.

- Deploy once (usually to Vercel) using the adapter.
- Users visit it and click Connect for each platform.
- The `glits` CLI (and the glits-skill for Hermes) only ever read the resulting tokens. They never do auth.

See the glits-skill/SKILL.md for the agent view and the `glits` package on npm for the publishing CLI.

## Required environment variables (canonical)

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`   (the full write token)

These are the single canonical names from the Vercel KV integration. The CLI/skill can use the read-only variant instead.

### For Meta platforms (Facebook, Instagram, Threads)

You must also provide a Meta/Facebook developer app so users can connect accounts via OAuth:

- `META_APP_ID`
- `META_APP_SECRET`

These are obtained from the Meta for Developers dashboard (https://developers.facebook.com/).

See `.env.example` in this directory for detailed comments on how to create the app and register the correct OAuth redirect URIs (`/auth/facebook/callback`, `/auth/instagram/callback`, `/auth/threads/callback`).

**Important platform prerequisites:**
- Facebook: User must admin at least one Page.
- Instagram: Account must be a Professional (Business/Creator) account linked to a Facebook Page.
- All three use the same Meta App ID/Secret (Facebook Login flow). Many publishing permissions require App Review or Development-mode tester access for full functionality.
