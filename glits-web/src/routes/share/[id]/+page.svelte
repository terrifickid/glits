<script>
  /** @type {import('./$types').PageData} */
  export let data;
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.shareText} />
  <meta property="og:site_name" content="Future Caribbean" />
  <meta property="og:title" content={data.title} />
  <meta property="og:description" content={data.shareText} />
  <meta property="og:image" content={data.image} />
  <meta property="og:url" content={data.shareUrl} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.title} />
  <meta name="twitter:description" content={data.shareText} />
  <meta name="twitter:image" content={data.image} />
</svelte:head>

<main class="share-page">
  <p class="eyebrow">Future Caribbean</p>
  <h1>{data.title}</h1>
  <p class="share-text">{data.shareText}</p>
  <p>
    <a href={data.link} target="_blank" rel="noopener noreferrer">{data.link}</a>
  </p>
</main>

<style>
  .share-page {
    max-width: 640px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
    color: #f8fbfc;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .eyebrow {
    margin: 0 0 0.75rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #2cdbf0;
  }

  h1 {
    margin: 0 0 1rem;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .share-text {
    white-space: pre-wrap;
    line-height: 1.6;
    color: rgba(248, 251, 252, 0.88);
  }
</style>