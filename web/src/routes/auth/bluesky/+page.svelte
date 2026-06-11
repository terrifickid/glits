<script>
  import { onMount } from 'svelte';
  import { blueskyFormEnhance, logBlueskyPageAuth } from './bluesky-client.js';

  let { data, form } = $props();

  onMount(() => logBlueskyPageAuth({ data, form }));
</script>

<div class="card">
  <h1>Connect Bluesky</h1>
  <p>Use an <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer">app password</a> — not your main account password.</p>

  <form method="POST" use:enhance={blueskyFormEnhance}>
    <p>
      <label>
        Handle
        <input name="handle" placeholder="you.bsky.social" required value={form?.handle ?? ''} />
      </label>
    </p>
    <p>
      <label>
        App password
        <input name="password" type="password" required />
      </label>
    </p>
    <p>
      <label>
        Server (optional)
        <input name="service" placeholder="https://bsky.social" value={form?.service ?? 'https://bsky.social'} />
      </label>
    </p>
    <button type="submit">Authorize</button>
  </form>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  {#if form?.success}
    <p class="success">Connected as @{form.handle}. Token saved.</p>
  {/if}
</div>

<p><a href="/">← Back</a></p>