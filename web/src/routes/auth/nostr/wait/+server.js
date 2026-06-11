import { GlitsBunkerSession } from '$lib/nostr/bunker-session.js';
import { secretKeyFromEnv } from '$lib/nostr/keys.js';
import { mustEnv } from '$lib/env.js';
import { loadToken, saveToken } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { authEntry, logAuth, serializeError } from '$lib/auth/verbose.js';

export const config = {
  maxDuration: 60,
};

export async function GET({ url }) {
  const session = url.searchParams.get('session');
  if (!session) {
    logAuth('nostr', 'wait:invalid', authEntry('failed', { error: 'missing session' }));
    return new Response('missing session', { status: 400 });
  }

  let pending;
  try {
    pending = await loadToken(`nostr-pending/${session}.json`);
  } catch (err) {
    logAuth('nostr', 'wait:expired', authEntry('failed', { session, error: serializeError(err) }));
    return new Response('session expired', { status: 404 });
  }

  const bunkerSecretKey = secretKeyFromEnv(mustEnv('NOSTR_BUNKER_NSEC'));
  const userSecretKey = secretKeyFromEnv(pending.user_nsec);

  const bunker = new GlitsBunkerSession({
    bunkerSecretKey,
    userSecretKey,
    connectSecret: pending.connect_secret,
    relays: pending.relays,
  });

  try {
    const { clientPubkey } = await bunker.waitForConnect(55_000);
    const account = pending.user_pubkey.slice(0, 12);

    await saveToken(tokenPath('nostr', account), {
      user_pubkey: pending.user_pubkey,
      user_npub: pending.user_npub,
      delegated_nsec: pending.user_nsec,
      bunker_pubkey: pending.bunker_pubkey,
      client_pubkey: clientPubkey,
      relays: pending.relays,
      connected_at: new Date().toISOString(),
      auth: 'nip46-bunker',
    });

    logAuth('nostr', 'wait:success', authEntry('success', { session, npub: pending.user_npub }));
    return Response.json({ ok: true, npub: pending.user_npub });
  } catch (err) {
    logAuth('nostr', 'wait:failed', authEntry('failed', { session, error: serializeError(err) }));
    return Response.json({ error: err.message || 'connect failed' }, { status: 408 });
  } finally {
    bunker.close();
  }
}