#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { createCommand } from '../src/commands/create.js';
import { listCommand } from '../src/commands/list.js';

const program = new Command();

program
  .name('glits')
  .description('Social media post queue and publishing CLI')
  .version('0.1.0');

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
    return sendCommand(opts);
  });

program.parse();