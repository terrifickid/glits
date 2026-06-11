export function tokenPath(platform, account) {
  const safe = account.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `tokens/${safe}-${platform}.json`;
}