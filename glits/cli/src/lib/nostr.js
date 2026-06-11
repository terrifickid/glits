import { decode } from 'nostr-tools/nip19';
import { finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

function secretKeyFromToken(tokenData) {
  const nsec = tokenData.delegated_nsec;
  if (!nsec) throw new Error('Token missing delegated_nsec');
  const { data } = decode(nsec);
  return data;
}

export async function signAndPublish(template, tokenData, { dryRun = false } = {}) {
  const relays = tokenData.relays?.length ? tokenData.relays : DEFAULT_RELAYS;

  if (dryRun) {
    return { platform_post_id: 'dry-run' };
  }

  const secretKey = secretKeyFromToken(tokenData);
  const signed = finalizeEvent(
    {
      ...template,
      created_at: template.created_at || Math.floor(Date.now() / 1000),
    },
    secretKey,
  );

  const pool = new SimplePool();
  try {
    await Promise.any(pool.publish(relays, signed));
  } finally {
    pool.close(relays);
  }

  return { platform_post_id: signed.id };
}