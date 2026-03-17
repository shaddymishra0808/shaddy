const chalk = require('chalk');
const logger = require('../utils/logger');

async function withRetry(fn, retries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try { return await fn(); } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

module.exports = {
  name: 'deleteChannels',
  description: 'Delete all channels in the server',
  async execute(guild) {
    const channels = guild.channels.cache.filter(c => c.deletable);

    if (channels.size === 0) {
      logger.warn('No deletable channels found.');
      return;
    }

    logger.info(`Deleting ${channels.size} channels...`);
    logger.divider();

    let success = 0;
    let failed = 0;
    const total = channels.size;
    const channelsArr = [...channels.values()];

    const BATCH = 10;
    for (let i = 0; i < channelsArr.length; i += BATCH) {
      const batch = channelsArr.slice(i, i + BATCH).map(channel =>
        withRetry(() => channel.delete())
          .then(() => {
            success++;
            logger.success(`Channel deleted: ${channel.name}`);
            logger.progress(success + failed, total);
          })
          .catch(() => {
            failed++;
            logger.error(`Failed: ${channel.name}`);
            logger.progress(success + failed, total);
          })
      );
      await Promise.all(batch);
    }

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: ${success}/${total} channels deleted`)}${failed ? chalk.yellow(` (${failed} failed)`) : ''}`);
  },
};
