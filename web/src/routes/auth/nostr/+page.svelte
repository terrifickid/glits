<script>
  import { onMount } from 'svelte';
  import { startNostrPolling } from './nostr-client.js';

  let { data } = $props();

  let status = $state('waiting');
  let error = $state('');

  onMount(() => {
    if (!data?.session || data.polling) return;
    return startNostrPolling(data.session, ({ status: nextStatus, error: nextError }) => {
      status = nextStatus;
      error = nextError;
    });
  });
</script>

<div class="card">
  <h1>Connect Nostr</h1>
  <p>Authorize glits to post on your behalf via NIP-46 (one time).</p>

  {#if data?.bunkerUrl}
    <p><strong>Posting as:</strong> <code>{data.npub}</code></p>
    <p>Copy this into your Nostr app (Amber, Primal, etc.) under <em>Connect to bunker</em>:</p>
    <p><textarea readonly rows="4" style="font-size:0.75rem">{data.bunkerUrl}</textarea></p>
    <p><a href={data.bunkerUrl}>Open bunker link</a></p>
  {/if}

  {#if status === 'waiting'}
    <p class="success">Waiting for authorization in your Nostr app…</p>
  {/if}

  {#if status === 'error'}
    <p class="error">{error}</p>
  {/if}
</div>

<p><a href="/">← Back</a></p>

<style>
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem;
    border: 1px solid #333;
    border-radius: 6px;
    background: #111;
    color: #f5f5f5;
  }
</style>