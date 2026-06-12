<script>
  import { onMount } from 'svelte';
  import { logHomeAuth } from './home-client.js';

  let { data } = $props();

  onMount(() => logHomeAuth(data));

  const providers = [
    { id: 'bluesky', label: 'Bluesky', href: '/auth/bluesky' },
    { id: 'mastodon', label: 'Mastodon', href: '/auth/mastodon' },
    { id: 'x', label: 'X', href: '/auth/x' },
    { id: 'threads', label: 'Threads', href: '/auth/threads' },
    { id: 'instagram', label: 'Instagram', href: '/auth/instagram' },
    { id: 'linkedin', label: 'LinkedIn', href: '/auth/linkedin' },
    { id: 'youtube', label: 'YouTube', href: '/auth/youtube' },
    { id: 'facebook', label: 'Facebook', href: '/auth/facebook' },
    { id: 'nostr', label: 'Nostr', href: '/auth/nostr' },
  ];
</script>

<h1>glits</h1>
<p>Connect your accounts to authorize posting.</p>

{#if data.connected}
  <p class="success">Connected {data.connected}.</p>
{/if}

{#if data.error}
  <p class="error">Authorization failed ({data.error}). Try again.</p>
{/if}

<ul>
  {#each providers as provider}
    <li><a href={provider.href}>Connect {provider.label}</a></li>
  {/each}
</ul>