export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

export function parseRelays(value) {
  if (!value) return DEFAULT_RELAYS;
  return value.split(',').map((r) => r.trim()).filter(Boolean);
}