# glits

Social media post queue and publishing.

## Setup

```bash
npm install
cp .env.example .env   # add BLOB_READ_WRITE_TOKEN
vercel env pull        # or copy from Vercel dashboard
```

## Config

Edit `glits.config.js` — uncomment platforms one at a time:

```js
export default {
  platforms: ['bluesky'],
};
```

## Workflow

1. Generate content (images/video) and host in the cloud
2. Connect accounts via the SvelteKit web app (`npm run dev:web`)
3. Create queue files:

```bash
npm run cli -- create \
  --id launch \
  --text "We're live!" \
  --link https://yoursite.com \
  --image-url https://your-cdn.com/hero.jpg \
  --queue ./my-posts
```

4. Send:

```bash
npm run cli -- send --queue ./my-posts
npm run cli -- send --queue ./my-posts --retry
npm run cli -- send --queue ./my-posts --dry-run
```

## Deploy web

```bash
npm run build:web
```

Deploy the `web/` directory to Vercel. Add `BLOB_READ_WRITE_TOKEN` in project env vars.

## Structure

```
glits.config.js   # enabled platforms (CLI only)
cli/              # Node CLI
web/              # SvelteKit OAuth app (Vercel)
```