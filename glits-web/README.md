# glits-web

The separate Vercel web app that performs account connections (OAuth / app passwords / bunker) and writes private token blobs into the shared Upstash Redis store.

This package is **not** part of the Hermes skill or the CLI.

- Deploy once (usually to Vercel) using the adapter.
- Users visit it and click Connect for each platform.
- The `glits` CLI (and the glits-skill for Hermes) only ever read the resulting tokens. They never do auth.

See the glits-skill/SKILL.md for the agent view and the `glits` package on npm for the publishing CLI.
