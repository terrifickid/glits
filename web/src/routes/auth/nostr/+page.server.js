import crypto from 'node:crypto';
import { toBunkerURL } from 'nostr-tools/nip46';
import { getPublicKey } from 'nostr-tools/pure';
import { env } from '$env/dynamic/private';
import { mustEnv } from '$lib/env.js';
import { saveToken, validateBlobPermissions } from '$lib/blob.js';
import { secretKeyFromEnv, createPostingKey } from '$lib/nostr/keys.js';
import { parseRelays } from '$lib/nostr/relays.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';

const fnLog = log.child({ provider: 'nostr', functionName: 'nostr/+page.server.js:load' });

export async function load({ url }) {
  const stepLog = fnLog.child({ functionName: 'load', phase: 'nostr:load:start' });
  const session = url.searchParams.get('session');
  if (session) {
    stepLog.debug({ phase: 'nostr:load:polling' }, 'Nostr polling mode');
    return { polling: true, session };
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  const connectSecret = crypto.randomBytes(8).toString('hex');
  const posting = createPostingKey();
  const bunkerSecretKey = secretKeyFromEnv(mustEnv('NOSTR_BUNKER_NSEC'));
  const bunkerPubkey = getPublicKey(bunkerSecretKey);
  const relays = parseRelays(env.NOSTR_RELAYS);

  try {
    const pendingPath = `nostr-pending/${sessionId}.json`;
    const storeLog = stepLog.child({ phase: 'nostr:pending:store:save', pendingPath });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname: pendingPath,
        dataKeys: ['connect_secret', 'user_nsec', 'user_pubkey', 'bunker_pubkey', 'relays'],
        hasNsec: true,
        sessionId,
      },
      'Starting Nostr pending session store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(pendingPath, {
      connect_secret: connectSecret,
      user_nsec: posting.nsec,
      user_pubkey: posting.pubkey,
      user_npub: posting.npub,
      bunker_pubkey: bunkerPubkey,
      relays,
    });
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname: pendingPath },
      'Nostr pending session store save succeeded',
    );
  } catch (err) {
    const errInfo = serializeError(err, 'load');
    stepLog.error({ type: LOG_TYPE.STORE_ERROR, functionName: 'load', err: errInfo }, 'Nostr pending store save failed');
    throw err;
  }

  stepLog.info({ functionName: 'load', phase: 'nostr:session:start', session: sessionId, npub: posting.npub }, 'Nostr session start');

  return {
    session: sessionId,
    bunkerUrl: toBunkerURL({ pubkey: bunkerPubkey, relays, secret: connectSecret }),
    npub: posting.npub,
    polling: false,
  };
}