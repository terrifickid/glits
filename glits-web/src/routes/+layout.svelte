<slot />

<style>
  :global(body) {
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 0;
    background: #0a1118;
    color: #f8fbfc;
    -webkit-font-smoothing: antialiased;
  }

  :global(a) {
    color: #2cdbf0;
  }

  :global(input, button) {
    font: inherit;
  }

  :global(input) {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(44, 219, 240, 0.15);
    border-radius: 6px;
    background: #060d12;
    color: #f8fbfc;
    width: 100%;
    box-sizing: border-box;
  }

  :global(button) {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 6px;
    background: #fa2a81;
    color: white;
    cursor: pointer;
  }

  :global(button:hover) {
    filter: brightness(1.1);
  }

  :global(.card) {
    max-width: 420px;
    padding: 1.5rem;
    border: 1px solid rgba(44, 219, 240, 0.12);
    border-radius: 12px;
    background: rgba(6, 13, 18, 0.72);
  }

  :global(.error) {
    color: #f87171;
    margin-top: 0.75rem;
  }

  :global(.success) {
    color: #42e7ab;
    margin-top: 0.75rem;
  }
</style>