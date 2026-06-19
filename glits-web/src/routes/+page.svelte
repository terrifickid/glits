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
  import { fly } from 'svelte/transition';
  import { formatShareText, LINK, PRESSKIT_TEXT } from '$lib/presskit.js';

  /** @type {import('./$types').PageData} */
  export let data;

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

  /** @param {{ id: string }} post */
  function buildFacebookShareUrl(post) {
    const sharePageUrl = new URL(`/share/${post.id}`, window.location.origin).href;
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}`;
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
    { id: 'facebook', label: 'Facebook' },
  ];

  let selectedCategory = 'default';
  let activePost = { text: PRESSKIT_TEXT, link: LINK, id: 'presskit' };
  let displayedPostText = formatShareText(PRESSKIT_TEXT);
  let isTyping = false;
  let postFlashing = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let typeTimer;
  let typeGen = 0;
  let postAnimKey = 0;

  /** @param {string} text */
  function startTypewriter(text) {
    const gen = ++typeGen;
    clearTimeout(typeTimer);

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      displayedPostText = text;
      isTyping = false;
      return;
    }

    isTyping = true;
    displayedPostText = '';
    let index = 0;
    const total = text.length;
    const msPerChar = Math.max(5, Math.min(18, Math.floor(2200 / total)));
    const chunk = total > 200 ? 2 : 1;

    const tick = () => {
      if (gen !== typeGen) return;
      if (index >= total) {
        isTyping = false;
        return;
      }
      index = Math.min(total, index + chunk);
      displayedPostText = text.slice(0, index);
      typeTimer = setTimeout(tick, msPerChar);
    };

    tick();
  }

  function flashPostTerminal() {
    postFlashing = true;
    setTimeout(() => {
      postFlashing = false;
    }, 450);
  }

  /** @param {{ text: string, link?: string, id: string }} post */
  function setActivePost(post) {
    activePost = post;
    postAnimKey += 1;
    flashPostTerminal();
  }

  $: {
    postAnimKey;
    startTypewriter(formatShareText(activePost.text));
  }

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

  function refreshRandomPost() {
    if (selectedCategory === 'default') return;
    pickRandomFromCategory(selectedCategory);
  }

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
      case 'facebook': {
        const sharePageUrl = new URL(`/share/${post.id}`, window.location.origin).href;
        const shareData = { title: 'Future Caribbean', text, url: sharePageUrl };
        try {
          if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
            await navigator.share(shareData);
            break;
          }
        } catch (err) {
          if (/** @type {Error} */ (err).name === 'AbortError') break;
        }
        window.open(buildFacebookShareUrl(post), '_blank', 'noopener,noreferrer');
        break;
      }
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

  @keyframes reveal-in {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: 200% center;
    }
    100% {
      background-position: -200% center;
    }
  }

  @keyframes cursor-blink {
    0%,
    49% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }

  @keyframes terminal-flash {
    0% {
      border-color: rgba(44, 219, 240, 0.55);
      box-shadow:
        0 0 0 1px rgba(44, 219, 240, 0.2),
        0 0 28px rgba(44, 219, 240, 0.18);
    }
    100% {
      border-color: rgba(255, 255, 255, 0.06);
      box-shadow: none;
    }
  }

  @keyframes scanline {
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(100%);
    }
  }

  .reveal {
    opacity: 0;
    animation: reveal-in 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: calc(var(--reveal-delay, 0) * 90ms);
  }

  .share-panel {
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: rgba(6, 13, 18, 0.55);
    backdrop-filter: blur(12px);
    text-align: left;
  }

  .presskit button:not(.category-pill):not(.refresh-btn) {
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

  .presskit button:not(.category-pill):not(.refresh-btn):hover {
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

  .post-terminal {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.34), rgba(6, 13, 18, 0.5)),
      rgba(0, 0, 0, 0.28);
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .post-terminal.flash {
    animation: terminal-flash 0.45s ease-out;
  }

  .post-terminal-scanline {
    pointer-events: none;
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(44, 219, 240, 0.04) 48%,
      rgba(44, 219, 240, 0.08) 50%,
      rgba(44, 219, 240, 0.04) 52%,
      transparent 100%
    );
    animation: scanline 5s linear infinite;
    opacity: 0.7;
  }

  .post-output {
    margin: 0;
    padding: 1rem 1rem 1.1rem;
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.55;
    color: rgba(248, 251, 252, 0.9);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    min-height: 6.5rem;
  }

  .post-cursor {
    display: inline-block;
    margin-left: 1px;
    color: var(--cyan);
    font-weight: 700;
    opacity: 0;
  }

  .post-cursor.blink {
    animation: cursor-blink 0.9s step-end infinite;
  }

  .post-terminal.typing .post-output {
    color: rgba(248, 251, 252, 0.96);
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

  .category-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .category-controls {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .category-rail {
    display: flex;
    flex: 1;
    min-width: 0;
    gap: 0.45rem;
    overflow-x: auto;
    padding: 0.2rem 0.1rem 0.35rem;
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  }

  .category-rail::-webkit-scrollbar {
    display: none;
  }

  .category-pill {
    position: relative;
    flex-shrink: 0;
    padding: 0.5rem 0.95rem;
    border-radius: 999px;
    border: 1px solid rgba(44, 219, 240, 0.16);
    background: rgba(10, 17, 24, 0.72);
    color: rgba(248, 251, 252, 0.68);
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    cursor: pointer;
    margin-bottom: 0;
    width: auto;
    transition:
      transform 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .category-pill:hover {
    transform: translateY(-1px);
    color: var(--white);
    border-color: rgba(44, 219, 240, 0.35);
  }

  .category-pill.active {
    color: var(--cyan);
    border-color: rgba(44, 219, 240, 0.5);
    background: linear-gradient(
      110deg,
      rgba(44, 219, 240, 0.18) 0%,
      rgba(250, 42, 129, 0.14) 45%,
      rgba(250, 193, 52, 0.12) 70%,
      rgba(44, 219, 240, 0.18) 100%
    );
    background-size: 220% 100%;
    animation: shimmer 4s linear infinite;
    box-shadow:
      0 0 0 1px rgba(44, 219, 240, 0.12),
      0 0 18px rgba(44, 219, 240, 0.2);
  }

  .category-controls .refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    margin-bottom: 0;
    border-radius: 50%;
    border: 1px solid rgba(44, 219, 240, 0.25);
    background: rgba(44, 219, 240, 0.08);
    color: var(--cyan);
    flex-shrink: 0;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  }

  .category-controls .refresh-btn:hover {
    border-color: rgba(44, 219, 240, 0.45);
    background: rgba(44, 219, 240, 0.16);
    transform: rotate(-30deg);
  }

  .category-controls .refresh-btn svg {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal {
      opacity: 1;
      animation: none;
      transform: none;
    }

    .post-terminal-scanline,
    .category-pill.active,
    .post-cursor.blink {
      animation: none;
    }
  }

</style>

<div class="page">
  <header class="site-header reveal" style="--reveal-delay: 0">
    <a class="logo-link" href="https://futurecaribbean.com" target="_blank" rel="noopener noreferrer">
      <img src="/fc_logo.png" alt="Future Caribbean" />
    </a>
  </header>

  <div class="presskit">
    <p class="eyebrow reveal" style="--reveal-delay: 1">Social Presskit</p>
    <h1 class="reveal" style="--reveal-delay: 2">Share the <em>Buildathon</em></h1>
    <p class="subtitle reveal" style="--reveal-delay: 3">
      Pick a category to load a random post, or Default for the original presskit text.
    </p>

    <div class="share-panel reveal" style="--reveal-delay: 4">
      <span class="section-label reveal" style="--reveal-delay: 5">Share to a platform</span>
      <div class="provider-grid">
        {#each SHARE_PROVIDERS as provider, i (provider.id)}
          <button
            class="provider-btn reveal"
            style="--reveal-delay: {6 + i}"
            class:primary={provider.id === 'native'}
            type="button"
            on:click={() => shareToProvider(activePost, provider.id)}
          >
            {provider.label}
          </button>
        {/each}
        <button
          class="provider-btn copy reveal"
          style="--reveal-delay: {6 + SHARE_PROVIDERS.length}"
          type="button"
          on:click={copyActivePost}
        >
          Copy post text
        </button>
      </div>

      <div class="section category-row reveal" style="--reveal-delay: {7 + SHARE_PROVIDERS.length}">
        <span class="section-label" id="category-label">Category</span>
        <div class="category-controls" role="group" aria-labelledby="category-label">
          <div class="category-rail">
            {#each POST_CATEGORIES as category (category.id)}
              <button
                type="button"
                class="category-pill"
                class:active={selectedCategory === category.id}
                aria-pressed={selectedCategory === category.id}
                on:click={() => selectCategory(category.id)}
              >
                {category.label}
              </button>
            {/each}
          </div>
          {#if selectedCategory !== 'default'}
            <button
              type="button"
              class="refresh-btn"
              aria-label="Pick another random post from this category"
              title="Pick another post"
              on:click={refreshRandomPost}
              in:fly={{ x: -10, duration: 220 }}
              out:fly={{ x: -10, duration: 180 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          {/if}
        </div>
      </div>

      <div class="section reveal" style="--reveal-delay: {8 + SHARE_PROVIDERS.length}">
        <span class="section-label">Post that gets shared</span>
        <div
          class="post-terminal"
          class:typing={isTyping}
          class:flash={postFlashing}
          aria-live="polite"
        >
          <div class="post-terminal-scanline" aria-hidden="true"></div>
          <pre class="post-output">
{displayedPostText}<span class="post-cursor" class:blink={isTyping}>▋</span></pre>
        </div>
        <p class="small">
          Links to
          <a href={activePost.link || LINK} target="_blank" rel="noopener noreferrer">
            {activePost.link || LINK}
          </a>
        </p>
      </div>
    </div>

    <p class="footer-note reveal" style="--reveal-delay: {9 + SHARE_PROVIDERS.length}">
      Future Caribbean Buildathon • 2026
    </p>
  </div>
</div>