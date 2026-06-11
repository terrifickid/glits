import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { encrypt, decrypt, getConversationKey } from 'nostr-tools/nip44';
import { SimplePool } from 'nostr-tools/pool';
import { NostrConnect } from 'nostr-tools/kinds';

export class GlitsBunkerSession {
  constructor({ bunkerSecretKey, userSecretKey, connectSecret, relays }) {
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
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.close();
        reject(new Error('Nostr connect timed out — open your Nostr app and connect to the bunker URL'));
      }, timeoutMs);

      this.subCloser = this.pool.subscribe(
        this.relays,
        { kinds: [NostrConnect], '#p': [this.bunkerPubkey], limit: 0 },
        {
          onevent: async (event) => {
            try {
              const done = await this.handleRequest(event);
              if (done) {
                clearTimeout(timer);
                resolve({
                  clientPubkey: this.clientPubkey,
                  userPubkey: this.userPubkey,
                });
              }
            } catch (err) {
              console.error('glits bunker request error', err);
            }
          },
        },
      );
    });
  }

  async handleRequest(event) {
    const clientPubkey = event.pubkey;
    const convKey = getConversationKey(this.bunkerSecretKey, clientPubkey);
    const req = JSON.parse(decrypt(event.content, convKey));
    const { id, method, params } = req;

    let result;
    let error;

    if (method === 'connect') {
      const secret = params[1] || params[0];
      if (secret !== this.connectSecret) {
        error = 'invalid secret';
      } else {
        this.connected = true;
        this.clientPubkey = clientPubkey;
        result = 'ack';
      }
    } else if (!this.connected || this.clientPubkey !== clientPubkey) {
      error = 'not connected';
    } else if (method === 'ping') {
      result = 'pong';
    } else if (method === 'get_public_key') {
      result = this.userPubkey;
    } else if (method === 'sign_event') {
      const template = JSON.parse(params[0]);
      const signed = finalizeEvent(template, this.userSecretKey);
      result = JSON.stringify(signed);
    } else if (method === 'switch_relays') {
      result = JSON.stringify(this.relays);
    } else {
      error = `unsupported method: ${method}`;
    }

    await this.sendResponse(clientPubkey, convKey, id, result, error);
    return this.connected && method === 'connect';
  }

  async sendResponse(clientPubkey, convKey, id, result, error) {
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
    if (this.subCloser) this.subCloser.close();
    this.pool.close(this.relays);
  }
}