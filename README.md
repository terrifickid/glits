# glits

Post to social media from one place. Bluesky, X, Mastodon, Instagram, Threads, LinkedIn, YouTube, Facebook, Nostr.

You talk to **Hermes**. Hermes runs **glits**. glits publishes to your connected accounts.

---

## 1. Install the skill (Hermes)

```bash
hermes skills install terrifickid/glits/glits
```

## 2. Add your secret

Put this in `~/.hermes/.env`:

```
UPSTASH_KV_REST_API_URL=...
UPSTASH_KV_REST_API_TOKEN=...
```

These are the Upstash Redis credentials (injected by the Vercel Upstash integration, or copied from your Upstash database).

## 3. Connect your accounts (one time)

Deploy the `web/` app to Vercel. Open it in a browser and click **Connect** for each platform you use.

## 4. Post

```bash
hermes chat --toolsets terminal,skills
```

Then type:

```
/glits
```

Tell it what to post. Example:

> Post "Hello world" with image https://example.com/photo.jpg to Bluesky

---

## Enable platforms

After install, edit:

`~/.hermes/skills/glits/glits.config.js`

Uncomment the platforms you want. Start with one (e.g. `bluesky`), test, then add more.

---

## Without Hermes (CLI)

```bash
npm install
cp .env.example .env
npm run cli -- create --id test --text "hello" --queue ./queue
npm run cli -- send --queue ./queue
```

---

## More detail

[docs/](docs/)