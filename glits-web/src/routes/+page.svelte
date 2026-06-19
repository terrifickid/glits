<svelte:head>
  <title>Future Caribbean • Social Presskit</title>
  <meta name="theme-color" content="#0A1118" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<script>
  /** @type {import('./$types').PageData} */
  export let data;

  const LINK = 'https://futurecaribbean.com';
  const PRESSKIT_TEXT =
    '🌴 Build intelligence that moves the real world. Future Caribbean is a global Agentic AI buildathon — 40 teams, 10 tracks, $70K prizes, NVIDIA H200 compute, and a live pitch at the NYSE. Applications close July 3 → futurecaribbean.com';
  const HASHTAGS =
    '#FutureCaribbean #AgenticAI #Buildathon #Caribbean #OpenSource #AI #Innovation';
  const PRESSKIT_POST = { text: PRESSKIT_TEXT, link: LINK };

  /** @param {string} text */
  function formatShareText(text) {
    return `${text}\n\n${HASHTAGS}`;
  }

  const POST_CATEGORIES = [
    { id: 'launch', label: 'Launch' },
    { id: 'build', label: 'Build' },
    { id: 'prizes', label: 'Prizes' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'ecosystem', label: 'Ecosystem' },
  ];

  const SHARE_PROVIDERS = [
    { id: 'native', label: 'Device share sheet' },
    { id: 'bluesky', label: 'Bluesky' },
    { id: 'x', label: 'X' },
    { id: 'mastodon', label: 'Mastodon' },
    { id: 'threads', label: 'Threads' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'facebook', label: 'Facebook' },
  ];

  let openShareId = null;
  /** @type {string | null} */
  let selectedCategory = null;

  $: filteredPosts = selectedCategory
    ? data.posts.filter((post) => post.category === selectedCategory)
    : data.posts;

  $: activeCategory = POST_CATEGORIES.find((category) => category.id === selectedCategory);

  function selectCategory(categoryId) {
    selectedCategory = selectedCategory === categoryId ? null : categoryId;
    closeShareMenu();
  }

  function toggleShareMenu(postId) {
    openShareId = openShareId === postId ? null : postId;
  }

  function closeShareMenu() {
    openShareId = null;
  }

  async function copyPost(text) {
    await navigator.clipboard.writeText(text);
  }

  async function copyPresskit() {
    await navigator.clipboard.writeText(formatShareText(PRESSKIT_TEXT));
    alert('Presskit post copied to clipboard.');
  }

  /**
   * @param {{ text: string, link?: string }} post
   * @param {string} providerId
   */
  async function shareToProvider(post, providerId) {
    const text = formatShareText(post.text);
    const link = post.link || LINK;

    switch (providerId) {
      case 'native': {
        const shareData = { title: 'Future Caribbean', text, url: link };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(text);
            alert('Post text copied to clipboard.');
          }
        } catch {
          /* user cancelled */
        }
        break;
      }
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
        break;
      case 'threads':
        window.open(
          `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
        break;
      case 'x':
        window.open(
          `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
        break;
      case 'bluesky':
        window.open(
          `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
        break;
      case 'mastodon':
        window.open(
          `https://mastodon.social/share?text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
          '_blank',
          'noopener,noreferrer',
        );
        await navigator.clipboard.writeText(text);
        alert('Post text copied — paste it into your LinkedIn post.');
        break;
      default:
        break;
    }
  }

  async function sharePresskit(providerId) {
    await shareToProvider(PRESSKIT_POST, providerId);
  }

  async function sharePost(post, providerId) {
    closeShareMenu();
    await shareToProvider({ text: post.text, link: post.link || LINK }, providerId);
  }
</script>

<svelte:window on:click={closeShareMenu} />

<style>
  .page {
    --pink: #fa2a81;
    --gold: #fac134;
    --cyan: #2cdbf0;
    --green: #42e7ab;
    --ink: #0a1118;
    --ink2: #060d12;
    --white: #f8fbfc;
    --muted: rgba(248, 251, 252, 0.62);
    --border: rgba(44, 219, 240, 0.12);
    min-height: 100vh;
    background:
      radial-gradient(65% 55% at 78% 12%, rgba(250, 42, 129, 0.12), transparent 60%),
      radial-gradient(55% 50% at 18% 28%, rgba(44, 219, 240, 0.1), transparent 58%),
      radial-gradient(40% 40% at 88% 72%, rgba(66, 231, 171, 0.07), transparent 55%),
      radial-gradient(50% 60% at 40% 8%, rgba(250, 193, 52, 0.08), transparent 55%),
      linear-gradient(180deg, var(--ink2), var(--ink));
    color: var(--white);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .site-header {
    display: flex;
    justify-content: center;
    padding: 1.5rem 1.5rem 0;
  }

  .logo-link {
    display: inline-flex;
    text-decoration: none;
    transition: transform 0.15s ease, filter 0.15s ease;
  }

  .logo-link:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }

  .logo-link img {
    width: min(220px, 72vw);
    height: auto;
    display: block;
  }

  .presskit {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    text-align: center;
  }

  .eyebrow {
    margin: 0 0 1rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--cyan);
  }

  h1 {
    margin: 0 0 1rem;
    font-size: clamp(2.2rem, 6vw, 3.4rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  h1 em {
    font-family: 'Instrument Serif', Georgia, serif;
    font-style: italic;
    font-weight: 400;
    color: var(--gold);
  }

  .subtitle {
    margin: 0 auto 2rem;
    max-width: 540px;
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--muted);
  }

  .share-panel {
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: rgba(6, 13, 18, 0.55);
    backdrop-filter: blur(12px);
    text-align: left;
  }

  .presskit button {
    display: block;
    width: 100%;
    padding: 1rem 1.1rem;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 0.65rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: filter 0.15s ease, transform 0.15s ease, background 0.15s ease;
  }

  .presskit button:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  .provider-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
  }

  .provider-btn {
    background: rgba(255, 255, 255, 0.04);
    color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 0;
  }

  .provider-btn:hover {
    border-color: rgba(44, 219, 240, 0.35);
    background: rgba(44, 219, 240, 0.08);
  }

  .provider-btn.primary {
    grid-column: 1 / -1;
    background: var(--pink);
    color: white;
    border: none;
  }

  .provider-btn.copy {
    grid-column: 1 / -1;
    border-color: rgba(250, 193, 52, 0.25);
  }

  .provider-btn.copy:hover {
    border-color: rgba(250, 193, 52, 0.45);
    background: rgba(250, 193, 52, 0.1);
  }

  .section {
    margin: 1.5rem 0 0;
  }

  .section-label {
    display: block;
    margin-bottom: 0.65rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(248, 251, 252, 0.45);
  }

  pre {
    margin: 0;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 1rem;
    border-radius: 8px;
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.55;
    color: rgba(248, 251, 252, 0.88);
  }

  .small {
    margin: 0.85rem 0 0;
    font-size: 0.82rem;
    color: rgba(248, 251, 252, 0.42);
    text-align: center;
  }

  .footer-note {
    margin-top: 2rem;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(248, 251, 252, 0.35);
  }

  .posts-section {
    border-top: 1px solid var(--border);
    padding: 3.5rem 1.5rem 4.5rem;
    background: linear-gradient(180deg, rgba(6, 13, 18, 0.35), rgba(6, 13, 18, 0.85));
  }

  .posts-container {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .posts-header {
    margin: 0 auto 2rem;
    text-align: center;
  }

  .posts-header h2 {
    margin: 0 0 0.75rem;
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .posts-header h2 em {
    font-family: 'Instrument Serif', Georgia, serif;
    font-style: italic;
    font-weight: 400;
    color: var(--cyan);
  }

  .posts-header p {
    margin: 0;
    color: var(--muted);
    font-size: 0.95rem;
  }

  .category-filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin: 0 auto 2rem;
  }

  .category-pill {
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba(44, 219, 240, 0.18);
    background: rgba(10, 17, 24, 0.72);
    color: rgba(248, 251, 252, 0.78);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }

  .category-pill:hover {
    border-color: rgba(44, 219, 240, 0.35);
    color: var(--white);
    transform: translateY(-1px);
  }

  .category-pill.active {
    background: rgba(44, 219, 240, 0.14);
    border-color: rgba(44, 219, 240, 0.45);
    color: var(--cyan);
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .post-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: visible;
    background: rgba(6, 13, 18, 0.72);
    transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }

  .post-card:hover {
    border-color: rgba(44, 219, 240, 0.28);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  }

  .post-id {
    display: inline-block;
    align-self: flex-start;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(10, 17, 24, 0.82);
    border: 1px solid rgba(44, 219, 240, 0.2);
    color: var(--cyan);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .post-body {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 1rem;
    flex: 1;
  }

  .post-text {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(248, 251, 252, 0.88);
    line-height: 1.5;
  }

  .post-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: auto;
  }

  .post-actions > button,
  .post-actions > a {
    flex: 1;
    min-width: calc(50% - 0.25rem);
    padding: 0.65rem 0.75rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    border: none;
    width: auto;
    margin: 0;
    transition: filter 0.15s ease, background 0.15s ease;
  }

  .share-wrap {
    position: relative;
    flex: 0 0 100%;
    width: 100%;
  }

  .post-share {
    width: 100%;
    padding: 0.65rem 0.75rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
    cursor: pointer;
    border: 1px solid rgba(250, 42, 129, 0.35);
    background: rgba(250, 42, 129, 0.12);
    color: var(--white);
    transition: filter 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }

  .post-share:hover,
  .post-share.open {
    background: rgba(250, 42, 129, 0.22);
    border-color: rgba(250, 42, 129, 0.55);
  }

  .share-menu {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 0.4rem);
    z-index: 20;
    margin: 0;
    padding: 0.35rem;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: rgba(6, 13, 18, 0.96);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    max-height: 240px;
    overflow-y: auto;
  }

  .share-menu button {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0.55rem 0.65rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: rgba(248, 251, 252, 0.9);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: none;
    text-align: left;
    cursor: pointer;
  }

  .share-menu button:hover {
    background: rgba(44, 219, 240, 0.1);
    color: var(--cyan);
  }

  .post-copy {
    background: rgba(255, 255, 255, 0.05);
    color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .post-copy:hover {
    background: rgba(44, 219, 240, 0.1);
    border-color: rgba(44, 219, 240, 0.25);
  }

  @media (min-width: 900px) {
    .posts-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1100px) {
    .posts-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>

<div class="page">
  <header class="site-header">
    <a class="logo-link" href="https://futurecaribbean.com" target="_blank" rel="noopener noreferrer">
      <img src="/fc_logo.png" alt="Future Caribbean" />
    </a>
  </header>

  <div class="presskit">
    <p class="eyebrow">Social Presskit</p>
    <h1>Share the <em>Buildathon</em></h1>
    <p class="subtitle">
      Share Future Caribbean with one click — pick a platform below and we’ll open the compose
      widget with our post ready to go.
    </p>

    <div class="share-panel">
      <span class="section-label">Share to a platform</span>
      <div class="provider-grid">
        {#each SHARE_PROVIDERS as provider (provider.id)}
          <button
            class="provider-btn"
            class:primary={provider.id === 'native'}
            type="button"
            on:click={() => sharePresskit(provider.id)}
          >
            {provider.label}
          </button>
        {/each}
        <button class="provider-btn copy" type="button" on:click={copyPresskit}>Copy post text</button>
      </div>

      <div class="section">
        <span class="section-label">Post that gets shared</span>
        <pre>{formatShareText(PRESSKIT_TEXT)}</pre>
        <p class="small">Links to <a href={LINK} target="_blank" rel="noopener noreferrer">{LINK}</a></p>
      </div>
    </div>

    <p class="footer-note">Future Caribbean Buildathon • 2026</p>
  </div>

  <section class="posts-section">
    <div class="posts-container">
      <div class="posts-header">
        <h2>Social <em>Posts</em></h2>
        <p>
          {#if activeCategory}
            {filteredPosts.length} {activeCategory.label.toLowerCase()} posts
          {:else}
            {data.posts.length} ready-to-publish posts
          {/if}
        </p>
      </div>

      <div class="category-filters" role="toolbar" aria-label="Filter posts by category">
        {#each POST_CATEGORIES as category (category.id)}
          <button
            class="category-pill"
            class:active={selectedCategory === category.id}
            type="button"
            aria-pressed={selectedCategory === category.id}
            on:click={() => selectCategory(category.id)}
          >
            {category.label}
          </button>
        {/each}
      </div>

      <div class="posts-grid">
      {#each filteredPosts as post (post.id)}
        <article class="post-card">
          <div class="post-body">
            <span class="post-id">{post.id}</span>
            <p class="post-text">{formatShareText(post.text)}</p>
            <div class="post-actions">
              <button class="post-copy" type="button" on:click={() => copyPost(formatShareText(post.text))}>Copy text</button>
              <div class="share-wrap" on:click|stopPropagation>
                <button
                  class="post-share"
                  class:open={openShareId === post.id}
                  type="button"
                  aria-expanded={openShareId === post.id}
                  aria-haspopup="menu"
                  on:click={() => toggleShareMenu(post.id)}
                >
                  Share ▾
                </button>
                {#if openShareId === post.id}
                  <ul class="share-menu" role="menu">
                    {#each SHARE_PROVIDERS as provider (provider.id)}
                      <li role="none">
                        <button
                          type="button"
                          role="menuitem"
                          on:click={() => sharePost(post, provider.id)}
                        >
                          {provider.label}
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </div>
          </div>
        </article>
      {/each}
      </div>
    </div>
  </section>
</div>