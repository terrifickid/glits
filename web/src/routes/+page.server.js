export function load({ url }) {
  return {
    connected: url.searchParams.get('connected'),
    error: url.searchParams.get('error'),
  };
}