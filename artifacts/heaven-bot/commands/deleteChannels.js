const chalk = require('chalk');
const logger = require('../utils/logger');

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

    const BATCH = 5;
    for (let i = 0; i < channelsArr.length; i += BATCH) {
      const batch = channelsArr.slice(i, i + BATCH).map(channel =>
        channel.delete()
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
