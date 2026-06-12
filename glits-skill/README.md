# glits-skill

This is the Hermes skill for **glits**.

It lets Hermes agents (with the `terminal` toolset) create social media posts and publish them via the `glits` CLI.

## Prerequisites (human setup)

1. **Install the glits CLI globally** in the environment where the Hermes terminal tool runs:

   ```bash
   npm install -g glits
   ```

   The agent will invoke `glits` (or `npx glits`) commands through the terminal. Without this, the agent will see "command not found: glits".

2. **Deploy the web auth app** (one time):

   The `glits-web/` directory in this repo is a separate SvelteKit app. Deploy it to Vercel and use it to **Connect** accounts for Bluesky, X, Instagram, etc.

   The CLI/skill never performs OAuth — it only reads tokens that the web app wrote to Upstash Redis.

3. **Upstash Redis credentials**

   You need an Upstash Redis instance (usually via Vercel integration). The skill will prompt for:
   - `UPSTASH_KV_REST_API_URL`
   - `UPSTASH_KV_REST_API_TOKEN`

   These are declared as required in the skill frontmatter.

4. **Extra secrets for token refresh** (only if using X, LinkedIn, or YouTube)

   Add these to your `~/.hermes/.env` and expose them via `~/.hermes/config.yaml`:

   ```yaml
   terminal:
     env_passthrough:
       - X_CLIENT_ID
       - X_CLIENT_SECRET
       - GOOGLE_CLIENT_ID
       - GOOGLE_CLIENT_SECRET
       - LINKEDIN_CLIENT_ID
       - LINKEDIN_CLIENT_SECRET
   ```

## Install the skill

```bash
hermes skills install terrifickid/glits/glits-skill
```

This fetches the `glits-skill/` directory from the GitHub repo (the directory that contains `SKILL.md`).

If your Hermes setup uses taps explicitly:

```bash
hermes skills tap add terrifickid/glits
hermes skills install glits-skill
```

## Using with the agent

Start Hermes with the required toolsets:

```bash
hermes chat --toolsets terminal,skills
```

Then interact with the skill (typically by saying something like "use the glits skill" or invoking it by name `/glits` depending on your Hermes setup).

The agent will be guided by the `SKILL.md` inside this directory. It will:
- Ask you for the Upstash secrets on first use (if not already provided).
- Instruct you on the `npm install -g glits` prerequisite if the CLI is missing.
- Always start by inspecting tokens.
- Use `--config` + `--queue` paths it controls.

## What this skill does NOT include

- The `glits` CLI itself (now a normal npm package: `npm install -g glits`).
- The web auth UI (see `glits-web/`).
- Any bundled Node or scripts (the old self-contained approach has been removed).

This keeps the skill tiny and reliable even when the Hermes terminal environment has a restricted PATH or no pre-installed Node runtimes for arbitrary skills.

## Updating the skill

When you make changes to `glits-skill/SKILL.md` or `glits.config.example.js`, re-install (or update) the skill in Hermes:

```bash
hermes skills install terrifickid/glits/glits-skill
```

Or use whatever update mechanism your Hermes version provides.

## Related packages

- `glits/` — The actual CLI (published to npm as `glits`).
- `glits-web/` — The Vercel auth app (deploy this separately).
