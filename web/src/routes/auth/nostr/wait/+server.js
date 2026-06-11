import { GlitsBunkerSession } from '$lib/nostr/bunker-session.js';
import { secretKeyFromEnv } from '$lib/nostr/keys.js';
import { mustEnv } from '$lib/env.js';
import { loadToken, saveToken, validateBlobPermissions } from '$lib/blob.js';
import { tokenPath } from '$lib/tokens.js';
import { log, LOG_TYPE, authEntry, serializeError } from '$lib/logger.js';

const fnLog = log.child({ provider: 'nostr', functionName: 'nostr/wait/+server.js:GET' });

export const config = {
  maxDuration: 60,
};

export async function GET({ url }) {
  const stepLog = fnLog.child({ functionName: 'GET', phase: 'nostr:wait:start' });
  const session = url.searchParams.get('session');
  if (!session) {
    stepLog.error({ type: LOG_TYPE.VALIDATION_ERROR, functionName: 'GET' }, 'Nostr wait invalid: missing session');
    return new Response('missing session', { status: 400 });
  }

  let pending;
  try {
    stepLog.info({ functionName: 'GET', phase: 'nostr:wait:load:pending' }, 'Loading pending for wait');
    pending = await loadToken(`nostr-pending/${session}.json`);
  } catch (err) {
    const errInfo = serializeError(err, 'GET');
    stepLog.error({ type: LOG_TYPE.NOSTR_DELEGATION_ERROR, functionName: 'GET', err: errInfo }, 'Nostr wait pending expired/load failed');
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
    stepLog.info({ functionName: 'GET', phase: 'nostr:wait:bunker:start' }, 'Calling bunker.waitForConnect');
    const { clientPubkey } = await bunker.waitForConnect(55_000);
    const account = pending.user_pubkey.slice(0, 12);

    const finalPath = tokenPath('nostr', account);
    const storeLog = stepLog.child({ phase: 'nostr:wait:store:save', finalPath });
    storeLog.info(
      {
        type: LOG_TYPE.STORE_SAVE_START,
        pathname: finalPath,
        dataKeys: ['user_pubkey', 'delegated_nsec', 'bunker_pubkey', 'client_pubkey', 'relays'],
        hasDelegatedNsec: true,
        account,
      },
      'Starting final Nostr delegated token store save',
    );

    // Validate store connection and write permission as first step before saving token
    await validateBlobPermissions();

    await saveToken(finalPath, {
      user_pubkey: pending.user_pubkey,
      user_npub: pending.user_npub,
      delegated_nsec: pending.user_nsec,
      bunker_pubkey: pending.bunker_pubkey,
      client_pubkey: clientPubkey,
      relays: pending.relays,
      connected_at: new Date().toISOString(),
      auth: 'nip46-bunker',
    });
    storeLog.info(
      { type: LOG_TYPE.STORE_SAVE_SUCCESS, pathname: finalPath },
      'Nostr delegated token store save succeeded',
    );

    stepLog.info({ functionName: 'GET', phase: 'nostr:wait:success' }, 'Nostr delegation wait success');
    return Response.json({ ok: true, npub: pending.user_npub });
  } catch (err) {
    const errInfo = serializeError(err, 'GET');
    stepLog.error(
      {
        type: LOG_TYPE.NOSTR_DELEGATION_ERROR,
        functionName: 'GET',
        err: errInfo,
      },
      'Nostr wait failed',
    );
    return Response.json({ error: err.message || 'connect failed' }, { status: 408 });
  } finally {
    bunker.close();
  }
}