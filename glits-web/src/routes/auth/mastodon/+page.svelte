<script>
  import { onMount } from 'svelte';
  import { mastodonFormEnhance, logMastodonPageAuth } from './mastodon-client.js';

  let { data, form } = $props();

  onMount(() => logMastodonPageAuth({ data, form }));
</script>

<div class="card">
  <h1>Connect Mastodon</h1>
  <p>Enter your instance URL (e.g. mastodon.social). You'll be redirected to authorize.</p>

  <form method="POST" action="?/start" use:enhance={mastodonFormEnhance}>
    <p>
      <label>
        Instance
        <input name="instance" placeholder="mastodon.social" required value={form?.instance ?? ''} />
      </label>
    </p>
    <button type="submit">Authorize</button>
  </form>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  {#if data?.error}
    <p class="error">Authorization failed ({data.error}). Try again.</p>
  {/if}
</div>

<p><a href="/">← Back</a></p>