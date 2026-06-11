import crypto from 'node:crypto';
import { toBunkerURL } from 'nostr-tools/nip46';
import { getPublicKey } from 'nostr-tools/pure';
import { env } from '$env/dynamic/private';
import { mustEnv } from '$lib/env.js';
import { saveToken } from '$lib/blob.js';
import { secretKeyFromEnv, createPostingKey } from '$lib/nostr/keys.js';
import { parseRelays } from '$lib/nostr/relays.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export async function load({ url }) {
  const session = url.searchParams.get('session');
  if (session) {
    return { polling: true, session };
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  const connectSecret = crypto.randomBytes(8).toString('hex');
  const posting = createPostingKey();
  const bunkerSecretKey = secretKeyFromEnv(mustEnv('NOSTR_BUNKER_NSEC'));
  const bunkerPubkey = getPublicKey(bunkerSecretKey);
  const relays = parseRelays(env.NOSTR_RELAYS);

  try {
    await saveToken(`nostr-pending/${sessionId}.json`, {
      connect_secret: connectSecret,
      user_nsec: posting.nsec,
      user_pubkey: posting.pubkey,
      user_npub: posting.npub,
      bunker_pubkey: bunkerPubkey,
      relays,
    });
  } catch (err) {
    logAuth('nostr', 'session:failed', authEntry('failed', { error: serializeError(err) }));
    throw err;
  }

  logAuth('nostr', 'session:start', authEntry('session:start', { session: sessionId, npub: posting.npub }));

  return {
    session: sessionId,
    bunkerUrl: toBunkerURL({ pubkey: bunkerPubkey, relays, secret: connectSecret }),
    npub: posting.npub,
    polling: false,
  };
}