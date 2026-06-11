import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { encrypt, decrypt, getConversationKey } from 'nostr-tools/nip44';
import { SimplePool } from 'nostr-tools/pool';
import { NostrConnect } from 'nostr-tools/kinds';
import { log, LOG_TYPE, serializeError } from '$lib/logger.js';

const fnLog = log.child({ functionName: 'GlitsBunkerSession' });

export class GlitsBunkerSession {
  constructor({ bunkerSecretKey, userSecretKey, connectSecret, relays }) {
    fnLog.debug({ phase: 'nostr:bunker:construct' }, 'Constructing GlitsBunkerSession');
    this.bunkerSecretKey = bunkerSecretKey;
    this.userSecretKey = userSecretKey;
    this.connectSecret = connectSecret;
    this.relays = relays;
    this.bunkerPubkey = getPublicKey(bunkerSecretKey);
    this.userPubkey = getPublicKey(userSecretKey);
    this.pool = new SimplePool();
    this.connected = false;
    this.clientPubkey = null;
    this.subCloser = null;
  }

  async waitForConnect(timeoutMs = 240000) {
    const stepLog = fnLog.child({ functionName: 'waitForConnect', phase: 'nostr:bunker:wait:start' });
    stepLog.info({ timeoutMs }, 'Starting Nostr bunker waitForConnect (long-poll for delegation)');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.close();
        const timeoutErr = new Error('Nostr connect timed out — open your Nostr app and connect to the bunker URL');
        stepLog.error(
          {
            type: LOG_TYPE.TIMEOUT_ERROR,
            functionName: 'waitForConnect',
            err: serializeError(timeoutErr, 'waitForConnect'),
            timeoutMs,
          },
          'Nostr bunker wait timed out',
        );
        reject(timeoutErr);
      }, timeoutMs);

      this.subCloser = this.pool.subscribe(
        this.relays,
        { kinds: [NostrConnect], '#p': [this.bunkerPubkey], limit: 0 },
        {
          onevent: async (event) => {
            try {
              stepLog.debug({ phase: 'nostr:bunker:event:received', eventKind: event.kind }, 'Received NostrConnect event');
              const done = await this.handleRequest(event);
              if (done) {
                clearTimeout(timer);
                stepLog.info({ phase: 'nostr:bunker:wait:success' }, 'Nostr bunker connect completed successfully');
                resolve({
                  clientPubkey: this.clientPubkey,
                  userPubkey: this.userPubkey,
                });
              }
            } catch (err) {
              const errInfo = serializeError(err, 'waitForConnect.onevent');
              stepLog.error(
                {
                  type: LOG_TYPE.NOSTR_BUNKER_ERROR,
                  functionName: 'waitForConnect',
                  err: errInfo,
                },
                'Error in bunker event handler',
              );
            }
          },
        },
      );
    });
  }

  async handleRequest(event) {
    const stepLog = fnLog.child({ functionName: 'handleRequest', phase: 'nostr:bunker:handle:request' });
    const clientPubkey = event.pubkey;
    stepLog.debug({ clientPubkey }, 'Handling Nostr bunker request');

    const convKey = getConversationKey(this.bunkerSecretKey, clientPubkey);
    const req = JSON.parse(decrypt(event.content, convKey));
    const { id, method, params } = req;

    stepLog.info({ phase: 'nostr:bunker:handle:method', method, id }, 'Processing bunker method');

    let result;
    let error;

    if (method === 'connect') {
      const secret = params[1] || params[0];
      if (secret !== this.connectSecret) {
        error = 'invalid secret';
        stepLog.error({ type: LOG_TYPE.NOSTR_DELEGATION_ERROR, functionName: 'handleRequest', method }, 'Invalid connect secret');
      } else {
        this.connected = true;
        this.clientPubkey = clientPubkey;
        result = 'ack';
        stepLog.info({ phase: 'nostr:bunker:connect:success' }, 'Nostr delegation connect succeeded');
      }
    } else if (!this.connected || this.clientPubkey !== clientPubkey) {
      error = 'not connected';
      stepLog.error({ type: LOG_TYPE.NOSTR_DELEGATION_ERROR, functionName: 'handleRequest', method }, 'Not connected or wrong client');
    } else if (method === 'ping') {
      result = 'pong';
    } else if (method === 'get_public_key') {
      result = this.userPubkey;
    } else if (method === 'sign_event') {
      const template = JSON.parse(params[0]);
      const signed = finalizeEvent(template, this.userSecretKey);
      result = JSON.stringify(signed);
      stepLog.debug({ phase: 'nostr:delegate:sign' }, 'Signed event for delegation');
    } else if (method === 'switch_relays') {
      result = JSON.stringify(this.relays);
    } else {
      error = `unsupported method: ${method}`;
      stepLog.error({ type: LOG_TYPE.NOSTR_BUNKER_ERROR, functionName: 'handleRequest', method }, 'Unsupported method');
    }

    await this.sendResponse(clientPubkey, convKey, id, result, error);
    return this.connected && method === 'connect';
  }

  async sendResponse(clientPubkey, convKey, id, result, error) {
    const stepLog = fnLog.child({ functionName: 'sendResponse', phase: 'nostr:bunker:send:response' });
    stepLog.debug({ clientPubkey, hasError: !!error }, 'Sending Nostr response');

    const payload = JSON.stringify(
      error ? { id, error } : { id, result },
    );
    const content = encrypt(payload, convKey);
    const response = finalizeEvent(
      {
        kind: NostrConnect,
        tags: [['p', clientPubkey]],
        content,
        created_at: Math.floor(Date.now() / 1000),
      },
      this.bunkerSecretKey,
    );
    await Promise.any(this.pool.publish(this.relays, response));
  }

  close() {
    const stepLog = fnLog.child({ functionName: 'close' });
    stepLog.debug({ phase: 'nostr:bunker:close' }, 'Closing bunker session');
    if (this.subCloser) this.subCloser.close();
    this.pool.close(this.relays);
  }
}