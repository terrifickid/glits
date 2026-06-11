# Hermes skill

Self-contained tap at `skills/glits/` — CLI bundled inside the skill.

## Install

```bash
hermes skills install terrifickid/glits/glits
```

One command. CLI and config ship inside the skill. First run auto-installs npm deps in the skill's bundled `cli/`.

## Secrets

`~/.hermes/.env`:

```
BLOB_READ_WRITE_TOKEN=...
X_CLIENT_ID=...
X_CLIENT_SECRET=...
```

`~/.hermes/config.yaml`:

```yaml
terminal:
  env_passthrough:
    - BLOB_READ_WRITE_TOKEN
    - X_CLIENT_ID
    - X_CLIENT_SECRET
    - GOOGLE_CLIENT_ID
    - GOOGLE_CLIENT_SECRET
    - LINKEDIN_CLIENT_ID
    - LINKEDIN_CLIENT_SECRET
```

## Config & platforms

Edit `~/.hermes/skills/glits/glits.config.js` after install.

## Web auth

Deploy `web/` from this repo to Vercel once; users connect accounts at `/auth/*`. Not part of skill install.

## Use

```
hermes chat --toolsets terminal,skills
/glits
```

## Maintainers

Sync bundled CLI before release:

```bash
npm run prepare:skill
```