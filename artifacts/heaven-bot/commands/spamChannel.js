const chalk = require('chalk');
const logger = require('../utils/logger');

async function withRetry(fn, retries = 3, delayMs = 300) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try { return await fn(); } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

module.exports = {
  name: 'spamChannel',
  description: 'Spam a single channel with a message N times',
  async execute(guild, args) {
    const channelId = args[0];
    const count = parseInt(args[1]);
    const message = args.slice(2).join(' ');

    if (!channelId || isNaN(count) || !message) {
      logger.error('Usage: spamChannel <channelId> <count> <message>');
      return;
    }
    if (count < 1 || count > 1000) {
      logger.error('Count must be between 1 and 1000.');
      return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      logger.error(`Channel not found: ${channelId}`);
      return;
    }
    if (!channel.isTextBased()) {
      logger.error('Target channel is not a text channel.');
      return;
    }

    logger.info(`Spamming #${channel.name} × ${count}...`);
    logger.divider();

    let success = 0;
    let failed = 0;

    const BATCH = 10;
    for (let i = 0; i < count; i += BATCH) {
      const batchSize = Math.min(BATCH, count - i);
      const batch = Array.from({ length: batchSize }, () =>
        withRetry(() => channel.send(message))
          .then(() => {
            success++;
            logger.progress(success + failed, count, `#${channel.name}`);
          })
          .catch(() => {
            failed++;
            logger.progress(success + failed, count, `#${channel.name}`);
          })
      );
      await Promise.all(batch);
    }

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: ${success}/${count} messages sent to #${channel.name}`)}`);
  },
};
