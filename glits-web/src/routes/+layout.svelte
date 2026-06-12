<slot />

<style>
  :global(body) {
    font-family: system-ui, sans-serif;
    margin: 0;
    padding: 2rem;
    background: #0a0a0a;
    color: #f5f5f5;
  }

  :global(a) {
    color: #60a5fa;
  }

  :global(input, button) {
    font: inherit;
  }

  :global(input) {
    padding: 0.5rem 0.75rem;
    border: 1px solid #333;
    border-radius: 6px;
    background: #111;
    color: #f5f5f5;
    width: 100%;
    box-sizing: border-box;
  }

  :global(button) {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    cursor: pointer;
  }

  :global(button:hover) {
    background: #1d4ed8;
  }

  :global(.card) {
    max-width: 420px;
    padding: 1.5rem;
    border: 1px solid #222;
    border-radius: 12px;
    background: #111;
  }

  :global(.error) {
    color: #f87171;
    margin-top: 0.75rem;
  }

  :global(.success) {
    color: #4ade80;
    margin-top: 0.75rem;
  }
</style>