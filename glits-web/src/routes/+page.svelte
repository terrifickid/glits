<svelte:head>
  <title>Future Caribbean Buildathon • Presskit</title>
</svelte:head>

<script>
  /** @type {import('./$types').PageData} */
  export let data;

  const URL = 'https://future-caribbean-buildathon-social.vercel.app';
  const TITLE = 'Future Caribbean Buildathon 2026';
  const DESC = 'Building the future in the Caribbean. Check out our project and join the movement!';
  const FULL_TEXT = `${TITLE}\n\n${DESC}\n\n${URL}`;

  async function shareNative() {
    const shareData = { title: TITLE, text: DESC, url: URL };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(FULL_TEXT);
        alert('Text copied to clipboard! You can now paste it into Facebook, Threads, Instagram, etc.');
      }
    } catch {
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

  async function copyPost(text) {
    await navigator.clipboard.writeText(text);
  }
</script>

<style>
  :global(body) {
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 0;
    line-height: 1.5;
    background: #0a0a0a;
    color: #f5f5f5;
  }

  .presskit {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  h1 {
    font-size: 2.2rem;
    margin: 0 0 8px;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #a3a3a3;
    margin-bottom: 32px;
  }

  .presskit button {
    display: block;
    width: 100%;
    padding: 18px;
    font-size: 1.1rem;
    margin-bottom: 10px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }

  .main-btn {
    background: #0066ff;
    color: white;
    font-weight: 600;
  }

  .fb {
    background: #1877f2;
    color: white;
  }

  .threads {
    background: #000;
    color: white;
    border: 1px solid #333;
  }

  .ig {
    background: #e1306c;
    color: white;
  }

  .copy {
    background: #333;
    color: white;
  }

  .section {
    margin: 28px 0;
  }

  pre {
    background: #111;
    border: 1px solid #222;
    padding: 12px;
    border-radius: 6px;
    white-space: pre-wrap;
    font-size: 0.9rem;
    color: #d4d4d4;
  }

  .small {
    font-size: 0.85rem;
    color: #737373;
  }

  .posts-section {
    border-top: 1px solid #222;
    padding: 48px 24px 64px;
    background: #050505;
  }

  .posts-header {
    max-width: 1400px;
    margin: 0 auto 32px;
  }

  .posts-header h2 {
    font-size: 1.75rem;
    margin: 0 0 8px;
  }

  .posts-header p {
    margin: 0;
    color: #a3a3a3;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .post-card {
    display: flex;
    flex-direction: column;
    border: 1px solid #222;
    border-radius: 14px;
    overflow: hidden;
    background: #111;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }

  .post-card:hover {
    border-color: #333;
    transform: translateY(-2px);
  }

  .post-media {
    position: relative;
    aspect-ratio: 4 / 5;
    background: #1a1a1a;
    overflow: hidden;
  }

  .post-media img,
  .post-media video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-id {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.72);
    color: #f5f5f5;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .post-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    flex: 1;
  }

  .post-text {
    margin: 0;
    font-size: 0.92rem;
    color: #e5e5e5;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .post-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
  }

  .post-actions button,
  .post-actions a {
    flex: 1;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 0.82rem;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    border: none;
    width: auto;
    margin: 0;
  }

  .post-copy {
    background: #262626;
    color: #f5f5f5;
  }

  .post-link {
    background: #1d4ed8;
    color: white;
  }

  @media (min-width: 1200px) {
    .posts-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (min-width: 1800px) {
    .posts-grid {
      grid-template-columns: repeat(5, 1fr);
      max-width: 2000px;
    }
  }
</style>

<div class="presskit">
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
</div>

<section class="posts-section">
  <div class="posts-header">
    <h2>Social posts</h2>
    <p>{data.posts.length} ready-to-publish posts from <code>social.json</code></p>
  </div>

  <div class="posts-grid">
    {#each data.posts as post (post.id)}
      <article class="post-card">
        <div class="post-media">
          <span class="post-id">{post.id}</span>
          {#if post.video}
            <video src={post.video} muted playsinline preload="metadata" poster={post.images?.portrait}></video>
          {:else if post.images?.portrait}
            <img src={post.images.portrait} alt="" loading="lazy" />
          {:else if post.images?.square}
            <img src={post.images.square} alt="" loading="lazy" />
          {/if}
        </div>
        <div class="post-body">
          <p class="post-text">{post.text}</p>
          <div class="post-actions">
            <button class="post-copy" type="button" on:click={() => copyPost(post.text)}>Copy text</button>
            {#if post.link}
              <a class="post-link" href={post.link} target="_blank" rel="noopener noreferrer">Open link</a>
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
</section>