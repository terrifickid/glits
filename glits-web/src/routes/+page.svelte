<svelte:head>
  <title>Future Caribbean Buildathon • Presskit</title>
</svelte:head>

<script>
  const URL = 'https://future-caribbean-buildathon-social.vercel.app';
  const TITLE = 'Future Caribbean Buildathon 2026';
  const DESC = 'Building the future in the Caribbean. Check out our project and join the movement!';
  const FULL_TEXT = `${TITLE}\n\n${DESC}\n\n${URL}`;

  async function shareNative() {
    const data = { title: TITLE, text: DESC, url: URL };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(FULL_TEXT);
        alert('Text copied to clipboard! You can now paste it into Facebook, Threads, Instagram, etc.');
      }
    } catch (e) {
      await navigator.clipboard.writeText(FULL_TEXT);
      alert('Text copied to clipboard!');
    }
  }

  function shareFacebook() {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}&quote=${encodeURIComponent(FULL_TEXT)}`;
    window.open(fbUrl, '_blank');
  }

  function shareThreads() {
    const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(FULL_TEXT)}`;
    window.open(threadsUrl, '_blank');
  }

  function shareInstagram() {
    alert('For Instagram:\n1. Copy the text below\n2. Open the Instagram app\n3. Create a new post or story and paste the link + description.');
    navigator.clipboard.writeText(FULL_TEXT);
  }

  function copyText() {
    navigator.clipboard.writeText(FULL_TEXT);
    alert('Presskit text + link copied to clipboard!');
  }
</script>

<style>
  :global(body) { 
    font-family: system-ui, -apple-system, sans-serif; 
    max-width: 680px; 
    margin: 40px auto; 
    padding: 20px; 
    line-height: 1.5; 
  }
  h1 { font-size: 2.2rem; margin: 0 0 8px; }
  .subtitle { font-size: 1.1rem; color: #555; margin-bottom: 32px; }
  button { 
    display: block; width: 100%; padding: 18px; font-size: 1.1rem; 
    margin-bottom: 10px; border: none; border-radius: 10px; cursor: pointer; 
  }
  .main-btn { background: #0066ff; color: white; font-weight: 600; }
  .fb { background: #1877f2; color: white; }
  .threads { background: #000; color: white; }
  .ig { background: #E1306C; color: white; }
  .copy { background: #333; color: white; }
  .section { margin: 28px 0; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 0.9rem; }
  .small { font-size: 0.85rem; color: #666; }
</style>

<h1>Future Caribbean Buildathon</h1>
<p class="subtitle">Building the future in the Caribbean. Share our presskit.</p>

<button class="main-btn" on:click={shareNative}>📣 Share Presskit</button>
<p class="small" style="text-align:center;">Opens your phone’s share sheet (Facebook, Instagram, Threads, etc.)</p>

<div class="section">
  <button class="fb" on:click={shareFacebook}>Share on Facebook</button>
  <button class="threads" on:click={shareThreads}>Share on Threads</button>
  <button class="ig" on:click={shareInstagram}>Share on Instagram</button>
  <button class="copy" on:click={copyText}>Copy text + link</button>
</div>

<div class="section">
  <strong>Text that gets shared:</strong>
  <pre>{FULL_TEXT}</pre>
</div>

<p class="small">Made for the Future Caribbean Buildathon • 2026</p>