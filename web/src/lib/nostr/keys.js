import { decode, nsecEncode, npubEncode } from 'nostr-tools/nip19';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';

export function secretKeyFromEnv(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('nsec')) {
    const { data } = decode(trimmed);
    return data;
  }
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  }
  throw new Error('NOSTR_BUNKER_NSEC must be nsec1... or 64-char hex');
}

export function createPostingKey() {
  const secretKey = generateSecretKey();
  return {
    secretKey,
    pubkey: getPublicKey(secretKey),
    nsec: nsecEncode(secretKey),
    npub: npubEncode(getPublicKey(secretKey)),
  };
}