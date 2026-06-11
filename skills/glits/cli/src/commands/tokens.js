import { listAllTokens } from '../tokens.js';

/**
 * tokens command: display all authorized accounts/tokens and their status.
 * This is a read-only diagnostic / "test" function intended for agents and users.
 * It never prints secrets.
 *
 * Usage:
 *   glits tokens
 *   glits tokens --json
 */
export async function tokensCommand(opts = {}) {
  let tokens;
  try {
    tokens = await listAllTokens();
  } catch (err) {
    const msg = err?.isBlobListError || /blob/i.test(String(err))
      ? 'Failed to list tokens from Vercel Blob. Is BLOB_READ_WRITE_TOKEN set and valid in the environment?'
      : `Error loading tokens: ${err.message || err}`;
    console.error(msg);
    if (opts.json) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    }
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify({ count: tokens.length, tokens }, null, 2));
    return;
  }

  if (!tokens.length) {
    console.log('No authorized tokens found.');
    console.log('Connect accounts using the glits web auth app (it writes the tokens to Vercel Blob).');
    console.log('Then re-run this command (or send) with the same BLOB_READ_WRITE_TOKEN.');
    return;
  }

  console.log(`Authorized tokens: ${tokens.length}`);
  console.log('');

  for (const t of tokens) {
    if (t.error) {
      console.log(`- ${t.platform || 'unknown'}  [ERROR]  ${t.pathname}`);
      console.log(`    ${t.error}`);
      continue;
    }

    const parts = [
      t.platform,
      t.account,
      `status=${t.status}`,
    ];
    console.log(`- ${parts.join(' / ')}`);
    if (t.obtained_at) {
      console.log(`    obtained_at: ${t.obtained_at}`);
    }
    if (t.expires_at) {
      console.log(`    expires_at:  ${t.expires_at}   expired=${t.expired}`);
    }
    if (t.has_refresh_token) {
      console.log(`    has_refresh_token: true`);
    }
    console.log(`    pathname: ${t.pathname}`);
    console.log('');
  }

  console.log('Note: "valid" means either no known expiry or not yet expired according to stored timestamps.');
  console.log('Tokens are managed exclusively via the web auth app. This command only reads them.');
}
