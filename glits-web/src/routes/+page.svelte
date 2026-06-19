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
  import { createCyberGlitchEngine } from '$lib/cyber-glitch-webgl.js';
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
  let isTyping = $state(false);
  let postFlashing = $state(false);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let typeTimer;
  let typeGen = 0;
  let postAnimKey = 0;
  let isGlitching = $state(false);
  let isPageGlitching = $state(false);
  /** @type {'minor' | 'major'} */
  let glitchSeverity = $state('minor');
  let glitchCorruptText = $state('');
  let glitchSignalText = $state('');
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let glitchTimer;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let glitchBurstTimer;

  /** @type {HTMLCanvasElement | undefined} */
  let overlayCanvas;
  /** @type {HTMLCanvasElement | undefined} */
  let displacementCanvas;
  /** @type {ReturnType<typeof createCyberGlitchEngine> | null} */
  let cyberEngine = null;
  let warpFilter = $state('none');
  let dispScale = $state(0);
  let pageWarpStyle = $state('');
  let webglReady = $state(false);

  const GLITCH_CHARS = '█▓▒░╔╗╚╝═║@#$%&*!?/_<>[]01▄▀▐▌░▒▓╳╬◢◣◤◥';
  const SIGNAL_PHRASES = [
    '█░▒▓ NO SIGNAL ▓▒░█',
    'NET::SYNC_LOST 0x4F2A',
    '▌▌▌ HF CARRIER DROP ▌▌▌',
    'ERR_80: FRAME DESYNC',
    '░░ PACKET CORRUPT ░░',
    '◢◤ VHS TRACKING FAIL ◢◤',
    '▀▄▀▄▀▄▀▄▀▄▀▄▀▄',
    'SIGNAL: ██░░░░ 23%',
    '▓▓ CARRIER LOST ▓▓',
    '0xDEAD 0xBEEF 0x80S',
    '╳╳╳ SYNC ERROR ╳╳╳',
    '▒▒ GHOST FRAME ▒▒',
  ];

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /** @param {string} text @param {number} [intensity] */
  function corruptText(text, intensity = 0.35) {
    return [...text]
      .map((ch) => {
        if (ch === ' ' || ch === '\n') return ch;
        if (Math.random() < intensity) {
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        return ch;
      })
      .join('');
  }

  function scheduleNextGlitch() {
    clearTimeout(glitchTimer);
    if (prefersReducedMotion()) return;
    const delay = 4500 + Math.random() * 14000;
    glitchTimer = setTimeout(() => {
      triggerGlitch(Math.random() < 0.55 ? 'major' : 'minor');
    }, delay);
  }

  /** @param {'minor' | 'major'} severity */
  function triggerGlitch(severity) {
    if (prefersReducedMotion()) {
      scheduleNextGlitch();
      return;
    }

    if (severity === 'minor' && isTyping) {
      scheduleNextGlitch();
      return;
    }

    glitchSeverity = severity;
    isGlitching = true;
    if (severity === 'major') {
      isPageGlitching = true;
    }
    cyberEngine?.setActive(true, severity);

    const source = displayedPostText;
    let ticks = 0;
    const maxTicks =
      severity === 'major'
        ? 22 + Math.floor(Math.random() * 28)
        : 9 + Math.floor(Math.random() * 9);

    clearInterval(glitchBurstTimer);
    glitchBurstTimer = setInterval(() => {
      const intensity =
        severity === 'major' ? 0.4 + Math.random() * 0.55 : 0.22 + Math.random() * 0.45;
      glitchCorruptText = corruptText(source, intensity);
      if (severity === 'major') {
        glitchSignalText = SIGNAL_PHRASES[Math.floor(Math.random() * SIGNAL_PHRASES.length)];
      }
      ticks += 1;
      if (ticks >= maxTicks) {
        clearInterval(glitchBurstTimer);
        isGlitching = false;
        isPageGlitching = false;
        glitchCorruptText = '';
        glitchSignalText = '';
        cyberEngine?.setActive(false);
        scheduleNextGlitch();
      }
    }, (severity === 'major' ? 22 : 38) + Math.floor(Math.random() * (severity === 'major' ? 28 : 32)));
  }

  /** @param {string} text */
  function startTypewriter(text) {
    const gen = ++typeGen;
    clearTimeout(typeTimer);

    if (prefersReducedMotion()) {
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

  $effect(() => {
    postAnimKey;
    startTypewriter(formatShareText(activePost.text));
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    scheduleNextGlitch();
    return () => {
      clearTimeout(glitchTimer);
      clearInterval(glitchBurstTimer);
    };
  });

  $effect(() => {
    if (!overlayCanvas || !displacementCanvas) return;
    cyberEngine = createCyberGlitchEngine({ overlayCanvas, displacementCanvas });
    webglReady = cyberEngine.supported;
    const onResize = () => cyberEngine?.resize();
    window.addEventListener('resize', onResize);
    let frame = 0;
    const tick = () => {
      const state = cyberEngine?.getFrameState();
      const dispMap = document.getElementById('cyber-disp-map');
      const chromaR = document.getElementById('cyber-chroma-r');
      const chromaB = document.getElementById('cyber-chroma-b');
      if (state) {
        dispScale = state.dispScale;
        warpFilter = 'url(#cyber-warp)';
        if (dispMap) dispMap.setAttribute('scale', String(state.dispScale));
        const chroma = state.warp.chromatic * (state.severity === 'major' ? 7 : 3);
        if (chromaR) chromaR.setAttribute('dx', String(-chroma));
        if (chromaB) chromaB.setAttribute('dx', String(chroma));
        const { x, y, rotX, rotY, skew, scale, brightness } = state.warp;
        pageWarpStyle = `perspective(900px) translate3d(${x}px, ${y}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) skewX(${skew}deg) scale(${scale}) brightness(${brightness})`;
      } else {
        dispScale = 0;
        warpFilter = 'none';
        pageWarpStyle = '';
        if (dispMap) dispMap.setAttribute('scale', '0');
        if (chromaR) chromaR.setAttribute('dx', '0');
        if (chromaB) chromaB.setAttribute('dx', '0');
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
      cyberEngine?.destroy();
      cyberEngine = null;
      webglReady = false;
    };
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

  onDestroy(() => {
    clearTimeout(typeTimer);
    clearTimeout(glitchTimer);
    clearInterval(glitchBurstTimer);
    cyberEngine?.destroy();
  });

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
    position: relative;
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

  .page-content {
    transform-origin: center center;
    will-change: transform, filter;
  }

  .cyber-filter-defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .cyber-disp-canvas {
    position: fixed;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .cyber-overlay-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 99998;
    pointer-events: none;
    mix-blend-mode: screen;
  }

  .cyber-signal {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    pointer-events: none;
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(1.1rem, 5vw, 2.8rem);
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    color: var(--cyan);
    text-shadow:
      4px 0 rgba(250, 42, 129, 0.95),
      -4px 0 rgba(44, 219, 240, 0.95),
      0 0 30px rgba(44, 219, 240, 0.8);
    mix-blend-mode: screen;
    animation: signal-flash 0.14s steps(3) infinite;
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

  @keyframes cp-glitch-shake {
    0% {
      transform: translate(0);
    }
    15% {
      transform: translate(-8px, 4px) skewX(-4deg);
    }
    30% {
      transform: translate(12px, -6px) skewX(3deg);
    }
    45% {
      transform: translate(-6px, -8px) skewX(-2deg);
    }
    60% {
      transform: translate(9px, 3px) skewX(2deg);
    }
    75% {
      transform: translate(-14px, 2px);
    }
    100% {
      transform: translate(0);
    }
  }

  @keyframes signal-flash {
    0%,
    100% {
      opacity: 0;
      transform: scale(0.9) skewX(0deg);
    }
    12% {
      opacity: 1;
      transform: scale(1.08) skewX(-8deg) translateX(-20px);
    }
    25% {
      opacity: 0.3;
      transform: scale(1) skewX(6deg) translateX(30px);
    }
    40% {
      opacity: 0.95;
      transform: scale(1.12) skewX(-4deg);
    }
    55% {
      opacity: 0;
    }
    70% {
      opacity: 0.85;
      transform: scale(1.05) skewX(10deg) translateX(-40px);
    }
  }

  @keyframes cp-terminal-flicker {
    0%,
    100% {
      opacity: 1;
      filter: brightness(1);
    }
    25% {
      opacity: 0.82;
      filter: brightness(1.35) saturate(1.4);
    }
    50% {
      opacity: 0.95;
      filter: brightness(0.85) hue-rotate(-15deg);
    }
    75% {
      opacity: 0.78;
      filter: brightness(1.5) hue-rotate(20deg);
    }
  }

  @keyframes cp-rgb-cyan {
    0%,
    100% {
      transform: translate(0);
      opacity: 0;
    }
    20% {
      transform: translate(-4px, 1px);
      opacity: 0.9;
    }
    40% {
      transform: translate(3px, -2px);
      opacity: 0.55;
    }
    60% {
      transform: translate(-2px, 2px);
      opacity: 0.75;
    }
  }

  @keyframes cp-rgb-magenta {
    0%,
    100% {
      transform: translate(0);
      opacity: 0;
    }
    15% {
      transform: translate(4px, -1px);
      opacity: 0.85;
    }
    35% {
      transform: translate(-3px, 2px);
      opacity: 0.6;
    }
    55% {
      transform: translate(2px, -2px);
      opacity: 0.8;
    }
  }

  @keyframes cp-slice {
    0% {
      clip-path: inset(0 0 0 0);
    }
    12% {
      clip-path: inset(8% 0 62% 0);
    }
    24% {
      clip-path: inset(72% 0 4% 0);
    }
    36% {
      clip-path: inset(38% 0 38% 0);
    }
    48% {
      clip-path: inset(0 0 0 0);
    }
    60% {
      clip-path: inset(55% 0 18% 0);
    }
    72% {
      clip-path: inset(12% 0 70% 0);
    }
    100% {
      clip-path: inset(0 0 0 0);
    }
  }

  @keyframes cp-noise {
    0% {
      transform: translate(0, 0);
      opacity: 0.15;
    }
    25% {
      transform: translate(-5%, 3%);
      opacity: 0.45;
    }
    50% {
      transform: translate(4%, -4%);
      opacity: 0.3;
    }
    75% {
      transform: translate(-3%, -2%);
      opacity: 0.5;
    }
    100% {
      transform: translate(2%, 4%);
      opacity: 0.2;
    }
  }

  @keyframes cp-bars {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    10% {
      opacity: 0.9;
    }
    100% {
      transform: translateY(120%);
      opacity: 0;
    }
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

  .post-terminal.glitching {
    animation: cp-terminal-flicker 0.08s steps(2) 10;
    border-color: rgba(250, 42, 129, 0.9);
    box-shadow:
      0 0 0 2px rgba(44, 219, 240, 0.5),
      0 0 40px rgba(250, 42, 129, 0.7),
      0 0 80px rgba(44, 219, 240, 0.35),
      inset 0 0 60px rgba(250, 42, 129, 0.12);
  }

  .post-terminal.glitching-major {
    animation: cp-terminal-flicker 0.06s steps(2) 14, cp-glitch-shake 0.12s steps(5) infinite;
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

  .post-glitch-noise {
    pointer-events: none;
    position: absolute;
    inset: -20%;
    z-index: 4;
    opacity: 0;
    background-image:
      repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.03) 0,
        rgba(255, 255, 255, 0.03) 1px,
        transparent 1px,
        transparent 3px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(44, 219, 240, 0.04) 0,
        rgba(44, 219, 240, 0.04) 1px,
        transparent 1px,
        transparent 4px
      );
    mix-blend-mode: overlay;
  }

  .post-terminal.glitching .post-glitch-noise {
    opacity: 1;
    animation: cp-noise 0.1s steps(4) infinite;
  }

  .post-glitch-bars {
    pointer-events: none;
    position: absolute;
    left: 0;
    right: 0;
    top: -40%;
    height: 30%;
    z-index: 3;
    opacity: 0;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(44, 219, 240, 0.35) 40%,
      rgba(250, 42, 129, 0.5) 55%,
      transparent
    );
  }

  .post-terminal.glitching .post-glitch-bars {
    animation: cp-bars 0.4s linear 1;
  }

  .post-output-stack {
    position: relative;
    z-index: 1;
  }

  .post-terminal.glitching .post-output-stack {
    animation: cp-glitch-shake 0.35s steps(4) 1;
  }

  .post-output-ghost {
    position: absolute;
    inset: 0;
    pointer-events: none;
    margin: 0;
    padding: 1rem 1rem 1.1rem;
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.55;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    mix-blend-mode: screen;
  }

  .post-output-ghost-cyan {
    color: var(--cyan);
    animation: cp-rgb-cyan 0.28s steps(3) infinite;
    clip-path: polygon(0 0, 100% 0, 100% 48%, 0 48%);
  }

  .post-output-ghost-magenta {
    color: var(--pink);
    animation: cp-rgb-magenta 0.22s steps(3) infinite;
    clip-path: polygon(0 52%, 100% 52%, 100% 100%, 0 100%);
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

  .post-terminal.glitching .post-output {
    animation: cp-slice 0.18s steps(5) infinite;
    text-shadow:
      4px 0 rgba(44, 219, 240, 1),
      -4px 0 rgba(250, 42, 129, 1),
      0 0 12px rgba(250, 193, 52, 0.6);
  }

  .post-terminal.glitching-major .post-output {
    text-shadow:
      6px 0 rgba(44, 219, 240, 1),
      -6px 0 rgba(250, 42, 129, 1),
      3px 3px rgba(250, 193, 52, 0.8),
      -3px -3px rgba(66, 231, 171, 0.7);
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

  @media (prefers-reduced-motion: reduce) {
    .post-terminal-scanline,
    .post-cursor.blink,
    .post-terminal.glitching,
    .post-terminal.glitching .post-output,
    .post-terminal.glitching .post-output-stack,
    .post-terminal.glitching .post-glitch-noise,
    .post-terminal.glitching .post-glitch-bars,
    .cyber-signal,
    .cyber-overlay-canvas {
      animation: none;
    }

    .cyber-overlay-canvas {
      display: none;
    }
  }

</style>

<div class="page">
  <svg class="cyber-filter-defs" aria-hidden="true">
    <defs>
      <filter
        id="cyber-warp"
        x="-15%"
        y="-15%"
        width="130%"
        height="130%"
        color-interpolation-filters="sRGB"
      >
        <feImage href="#cyber-disp-canvas" result="dispTex" preserveAspectRatio="none" />
        <feDisplacementMap
          id="cyber-disp-map"
          in="SourceGraphic"
          in2="dispTex"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="G"
          result="warped"
        />
        <feColorMatrix
          in="warped"
          type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="chRed"
        />
        <feColorMatrix
          in="warped"
          type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="chGreen"
        />
        <feColorMatrix
          in="warped"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="chBlue"
        />
        <feOffset id="cyber-chroma-r" in="chRed" dx="0" dy="0" result="chRedOff" />
        <feOffset id="cyber-chroma-b" in="chBlue" dx="0" dy="0" result="chBlueOff" />
        <feBlend in="chRedOff" in2="chGreen" mode="screen" result="rg" />
        <feBlend in="rg" in2="chBlueOff" mode="screen" result="out" />
      </filter>
    </defs>
  </svg>

  <canvas
    bind:this={displacementCanvas}
    id="cyber-disp-canvas"
    class="cyber-disp-canvas"
    aria-hidden="true"
  ></canvas>
  <canvas bind:this={overlayCanvas} class="cyber-overlay-canvas" aria-hidden="true"></canvas>

  {#if isPageGlitching && glitchSignalText}
    <div class="cyber-signal" aria-hidden="true">{glitchSignalText}</div>
  {/if}

  <div
    class="page-content"
    style:filter={warpFilter}
    style:transform={pageWarpStyle}
    class:cyber-warping={isGlitching && webglReady}
  >
  <header class="site-header">
    <a class="logo-link" href="https://futurecaribbean.com" target="_blank" rel="noopener noreferrer">
      <img src="/fc_logo.png" alt="Future Caribbean" />
    </a>
  </header>

  <div class="presskit">
    <p class="eyebrow">Social Presskit</p>
    <h1>Share the <em>Buildathon</em></h1>
    <p class="subtitle">
      Pick a category to load a random post, or Default for the original presskit text.
    </p>

    <div class="share-panel">
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
        <div
          class="post-terminal"
          class:typing={isTyping}
          class:flash={postFlashing}
          class:glitching={isGlitching}
          class:glitching-major={isGlitching && glitchSeverity === 'major'}
          aria-live="polite"
        >
          <div class="post-terminal-scanline" aria-hidden="true"></div>
          <div class="post-glitch-noise" aria-hidden="true"></div>
          <div class="post-glitch-bars" aria-hidden="true"></div>
          <div class="post-output-stack">
            {#if isGlitching}
              <pre class="post-output-ghost post-output-ghost-cyan" aria-hidden="true">
{glitchCorruptText}<span class="post-cursor">▋</span></pre>
              <pre class="post-output-ghost post-output-ghost-magenta" aria-hidden="true">
{glitchCorruptText}<span class="post-cursor">▋</span></pre>
            {/if}
            <pre class="post-output">
{displayedPostText}<span class="post-cursor" class:blink={isTyping && !isGlitching}>▋</span></pre>
          </div>
        </div>
        <p class="small">
          Links to
          <a href={activePost.link || LINK} target="_blank" rel="noopener noreferrer">
            {activePost.link || LINK}
          </a>
        </p>
      </div>
    </div>

    <p class="footer-note">Future Caribbean Buildathon • 2026</p>
  </div>
  </div>
</div>