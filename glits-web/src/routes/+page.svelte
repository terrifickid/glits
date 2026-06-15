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

  const SHARE_PROVIDERS = [
    { id: 'native', label: 'Device share sheet' },
    { id: 'bluesky', label: 'Bluesky' },
    { id: 'x', label: 'X' },
    { id: 'mastodon', label: 'Mastodon' },
    { id: 'threads', label: 'Threads' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'nostr', label: 'Nostr' },
  ];

  let openShareId = null;

  function toggleShareMenu(postId) {
    openShareId = openShareId === postId ? null : postId;
  }

  function closeShareMenu() {
    openShareId = null;
  }

  function postPayload(post) {
    return {
      text: post.text,
      link: post.link || '',
      imageUrl: post.images?.portrait || post.images?.square || '',
      videoUrl: post.video || '',
    };
  }

  async function sharePost(post, providerId) {
    const { text, link, imageUrl, videoUrl } = postPayload(post);
    closeShareMenu();

    switch (providerId) {
      case 'native': {
        const shareData = { title: 'Future Caribbean', text };
        if (link) shareData.url = link;
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
        const shareUrl = link || URL;
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
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
      case 'linkedin': {
        if (link) {
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
            '_blank',
            'noopener,noreferrer',
          );
        }
        await navigator.clipboard.writeText(text);
        if (!link) {
          window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer');
        }
        alert('Post text copied — paste it into your LinkedIn post.');
        break;
      }
      case 'instagram': {
        await navigator.clipboard.writeText(text);
        const mediaNote = videoUrl
          ? `\n\nVideo: ${videoUrl}`
          : imageUrl
            ? `\n\nImage: ${imageUrl}`
            : '';
        alert(
          `Post text copied.${mediaNote}\n\nOpen Instagram, create a new post or reel, paste the caption, and add the media URL if needed.`,
        );
        break;
      }
      case 'youtube': {
        await navigator.clipboard.writeText(text);
        window.open('https://www.youtube.com/upload', '_blank', 'noopener,noreferrer');
        alert(
          `Post text copied.${videoUrl ? `\n\nVideo: ${videoUrl}` : ''}\n\nPaste as your title/description on YouTube and upload the video.`,
        );
        break;
      }
      case 'nostr': {
        await navigator.clipboard.writeText(text);
        window.open('https://primal.net/home', '_blank', 'noopener,noreferrer');
        alert('Post text copied — paste it into your Nostr client.');
        break;
      }
      default:
        break;
    }
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

  .main-btn {
    background: var(--pink);
    color: white;
  }

  .fb,
  .threads,
  .ig,
  .copy {
    background: rgba(255, 255, 255, 0.04);
    color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .fb:hover {
    border-color: rgba(24, 119, 242, 0.45);
    background: rgba(24, 119, 242, 0.12);
  }

  .threads:hover {
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.08);
  }

  .ig:hover {
    border-color: rgba(225, 48, 108, 0.45);
    background: rgba(225, 48, 108, 0.12);
  }

  .copy:hover {
    border-color: rgba(44, 219, 240, 0.35);
    background: rgba(44, 219, 240, 0.08);
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

  .posts-header {
    max-width: 1400px;
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

  .posts-header code {
    color: var(--gold);
    font-size: 0.88em;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    max-width: 1600px;
    margin: 0 auto;
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

  .post-media {
    position: relative;
    aspect-ratio: 4 / 5;
    background: #060d12;
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
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .post-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: auto;
  }

  .post-actions button,
  .post-actions a {
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
    flex: 1 1 100%;
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

  .post-link {
    background: var(--pink);
    color: white;
  }

  .post-link:hover {
    filter: brightness(1.1);
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
      Building intelligence that moves the real world. Copy or share our presskit across Facebook,
      Threads, Instagram, and more.
    </p>

    <div class="share-panel">
      <button class="main-btn" on:click={shareNative}>Share Presskit</button>
      <p class="small">Opens your phone’s share sheet (Facebook, Instagram, Threads, etc.)</p>

      <div class="section">
        <button class="fb" on:click={shareFacebook}>Share on Facebook</button>
        <button class="threads" on:click={shareThreads}>Share on Threads</button>
        <button class="ig" on:click={shareInstagram}>Share on Instagram</button>
        <button class="copy" on:click={copyText}>Copy text + link</button>
      </div>

      <div class="section">
        <span class="section-label">Text that gets shared</span>
        <pre>{FULL_TEXT}</pre>
      </div>
    </div>

    <p class="footer-note">Future Caribbean Buildathon • 2026</p>
  </div>

  <section class="posts-section">
    <div class="posts-header">
      <h2>Social <em>Posts</em></h2>
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
  </section>
</div>