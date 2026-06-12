#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { createCommand } from '../src/commands/create.js';
import { listCommand } from '../src/commands/list.js';
import { log, ERROR_TYPE } from '../src/lib/logger.js';

const program = new Command();

program
  .name('glits')
  .description('Social media post queue and publishing CLI')
  .version('0.1.0')
  .option('--config <path>', 'Path to glits.config.js (highest precedence; great for agents)');

// Global handlers per log-example.js
process.on('uncaughtException', (err, origin) => {
  log.error({ type: ERROR_TYPE.UNCAUGHT_EXCEPTION, err, origin, stack: err?.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error({ type: ERROR_TYPE.UNHANDLED_REJECTION, promise, reason, stack: reason && reason.stack }, 'Unhandled rejection');
  process.exit(1);
});

// Global strong error logging following log-example.js pattern.
// These ensure we never lose uncaught errors; they are logged with full context before exit.
process.on('uncaughtException', (err, origin) => {
  log.error(
    {
      type: ERROR_TYPE.UNCAUGHT_EXCEPTION,
      err,
      origin,
      stack: err?.stack,
    },
    'Uncaught exception',
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(
    {
      type: ERROR_TYPE.UNHANDLED_REJECTION,
      promise,
      reason,
      stack: reason && reason.stack,
    },
    'Unhandled rejection',
  );
  process.exit(1);
});

program
  .command('create')
  .description('Create platform queue files from cloud asset URLs')
  .requiredOption('--id <id>', 'Post id')
  .requiredOption('--text <text>', 'Post text')
  .option('--link <url>', 'Website link')
  .option('--image-url <url>', 'Image URL (repeatable)', (v, prev) => [...prev, v], [])
  .option('--video-url <url>', 'Video URL (repeatable)', (v, prev) => [...prev, v], [])
  .option('--platforms <list>', 'Comma-separated platforms (default: glits.config.js)')
  .option('--queue <dir>', 'Queue directory', './queue')
  .action(createCommand);

program
  .command('list')
  .description('List queue files and status')
  .option('--queue <dir>', 'Queue directory', './queue')
  .action(listCommand);

program
  .command('send')
  .description('Send all queued posts to every authorized account')
  .option('--queue <dir>', 'Queue directory', './queue')
  .option('--retry', 'Also retry failed posts')
  .option('--dry-run', 'Validate without posting')
  .action(async (opts) => {
    const { sendCommand } = await import('../src/commands/send.js');
    try {
      return await sendCommand(opts);
    } catch (err) {
      log.error(
        {
          type: ERROR_TYPE.SEND_FAILED,
          functionName: 'send action',
          err,
          opts: { ...opts, queue: opts.queue }, // avoid any secrets
        },
        'Top-level send command error',
      );
      throw err; // let global handler also fire if needed, or rethrow for commander
    }
  });

program
  .command('tokens')
  .description('List all authorized accounts/tokens from the token store and show status (read-only diagnostic)')
  .option('--json', 'Output machine-readable JSON (for agents)')
  .action(async (opts) => {
    const { tokensCommand } = await import('../src/commands/tokens.js');
    return tokensCommand(opts);
  });

// Make --config (global) win over GLITS_CONFIG env for the config loader.
// This runs before subcommand actions, so the env the existing config.js
// checks is set to the explicit value. Perfect for `npx glits --config foo.js ...`.
program.hook('preAction', (thisCommand) => {
  const o = thisCommand.opts();
  if (o.config) {
    process.env.GLITS_CONFIG = o.config;
  }
});

program.parse();
