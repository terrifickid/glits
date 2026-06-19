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
  import { onDestroy } from 'svelte';
  import { formatShareText, LINK, PRESSKIT_TEXT } from '$lib/presskit.js';

  /** @type {import('./$types').PageData} */
  let { data } = $props();

  /** @param {Record<string, string>} params */
  function buildQueryString(params) {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /** @param {string} text @param {string} link */
  function buildLinkedInShareUrl(text, link) {
    return `https://www.linkedin.com/feed/?${buildQueryString({
      shareActive: 'true',
      text,
      shareUrl: link,
    })}`;
  }

  const POST_CATEGORIES = [
    { id: 'default', label: 'Default' },
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
    { id: 'whatsapp', label: 'WhatsApp' },
  ];

  let selectedCategory = $state('default');
  let activePost = $state({ text: PRESSKIT_TEXT, link: LINK, id: 'presskit' });
  let displayedPostText = $state(formatShareText(PRESSKIT_TEXT));
  let fullPostText = $derived(formatShareText(activePost.text));
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let typeTimer;
  let typeGen = 0;
  let postAnimKey = 0;

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /** @param {string} text */
  function startTypewriter(text) {
    const gen = ++typeGen;
    clearTimeout(typeTimer);

    if (prefersReducedMotion()) {
      displayedPostText = text;
      return;
    }

    displayedPostText = '';
    let index = 0;
    const total = text.length;
    const msPerChar = Math.max(12, Math.min(32, Math.floor(3800 / total)));
    const chunk = total > 320 ? 2 : 1;

    const tick = () => {
      if (gen !== typeGen) return;
      if (index >= total) {
        return;
      }
      index = Math.min(total, index + chunk);
      displayedPostText = text.slice(0, index);
      typeTimer = setTimeout(tick, msPerChar);
    };

    tick();
  }

  /** @param {{ text: string, link?: string, id: string }} post */
  function setActivePost(post) {
    activePost = post;
    postAnimKey += 1;
  }

  $effect(() => {
    postAnimKey;
    startTypewriter(formatShareText(activePost.text));
  });

  /** @template T @param {T[]} arr @returns {T} */
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** @param {string} categoryId */
  function pickRandomFromCategory(categoryId) {
    const pool = data.posts.filter((p) => p.category === categoryId);
    if (!pool.length) return;
    const post = pickRandom(pool);
    setActivePost({ text: post.text, link: post.link || LINK, id: post.id });
  }

  /** @param {string} categoryId */
  function selectCategory(categoryId) {
    selectedCategory = categoryId;
    if (categoryId === 'default') {
      setActivePost({ text: PRESSKIT_TEXT, link: LINK, id: 'presskit' });
      return;
    }
    pickRandomFromCategory(categoryId);
  }

  onDestroy(() => clearTimeout(typeTimer));

  async function copyActivePost() {
    await navigator.clipboard.writeText(formatShareText(activePost.text));
    alert('Post copied to clipboard.');
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
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`,
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
        window.open(buildLinkedInShareUrl(text, link), '_blank', 'noopener,noreferrer');
        break;
      default:
        break;
    }
  }

</script>

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
  }

  .provider-btn.primary:hover {
    border-color: rgba(250, 42, 129, 0.35);
    background: rgba(250, 42, 129, 0.08);
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

  .section:first-child {
    margin-top: 0;
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

  .post-box {
    position: relative;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .post-box pre {
    margin: 0;
    padding: 1rem;
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .post-sizer {
    visibility: hidden;
    pointer-events: none;
    user-select: none;
  }

  .post-typed {
    position: absolute;
    inset: 0;
    color: rgba(248, 251, 252, 0.88);
  }

  .footer-note {
    margin-top: 2rem;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(248, 251, 252, 0.35);
  }

  .category-select {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0.75rem 2.25rem 0.75rem 0.95rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.28);
    color: var(--white);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23f8fbfc' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.85rem center;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }

  .category-select:hover,
  .category-select:focus {
    outline: none;
    border-color: rgba(44, 219, 240, 0.35);
    background-color: rgba(0, 0, 0, 0.36);
  }

  .category-select option {
    background: var(--ink);
    color: var(--white);
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
      From fragmented islands to global scale — help 40 teams build the agentic AI wave. July 3 deadline. Forward to your network.
    </p>

    <div class="share-panel">
      <div class="section">
        <span class="section-label" id="category-label">Category</span>
        <select
          id="category-select"
          class="category-select"
          value={selectedCategory}
          onchange={(e) => selectCategory(e.currentTarget.value)}
          aria-labelledby="category-label"
        >
          {#each POST_CATEGORIES as category (category.id)}
            <option value={category.id}>{category.label}</option>
          {/each}
        </select>
      </div>

      <div class="section">
        <span class="section-label">Post that gets shared</span>
        <div class="post-box">
          <pre class="post-sizer" aria-hidden="true">{fullPostText}</pre>
          <pre class="post-typed" aria-live="polite">{displayedPostText}</pre>
        </div>
      </div>

      <div class="section">
        <span class="section-label">Share to a platform</span>
        <div class="provider-grid">
          {#each SHARE_PROVIDERS as provider (provider.id)}
            <button
              class="provider-btn"
              class:primary={provider.id === 'native'}
              type="button"
              onclick={() => shareToProvider(activePost, provider.id)}
            >
              {provider.label}
            </button>
          {/each}
          <button class="provider-btn copy" type="button" onclick={copyActivePost}>
            Copy post text
          </button>
        </div>
      </div>
    </div>

    <p class="footer-note">Future Caribbean Buildathon • 2026</p>
  </div>
</div>