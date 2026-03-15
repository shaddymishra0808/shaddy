const logger = require('../utils/logger');

module.exports = {
  name: 'createChannels',
  description: 'Create multiple channels with a base name',
  async execute(guild, args) {
    const count = parseInt(args[0]);
    const baseName = args[1] || 'channel';

    if (isNaN(count) || count < 1 || count > 500) {
      logger.error('Usage: createChannels <count> <name>  (count must be 1–500)');
      return;
    }

    logger.info(`Creating ${count} channels with base name "${baseName}"...`);
    logger.divider();

    let success = 0;
    let failed = 0;

    const BATCH = 5;
    for (let i = 0; i < count; i += BATCH) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH, count); j++) {
        const name = `${baseName}-${j + 1}`;
        batch.push(
          guild.channels.create({ name, type: 0 })
            .then(() => {
              success++;
              logger.success(`Channel created: ${name}`);
              logger.progress(success + failed, count);
            })
            .catch(() => {
              failed++;
              logger.error(`Failed to create: ${name}`);
              logger.progress(success + failed, count);
            })
        );
      }
      await Promise.all(batch);
    }

    logger.divider();
    if (failed === 0) {
      console.log(`\n${require('chalk').green(`SUCCESS: ${success}/${count} channels created`)}`);
    } else {
      console.log(`\n${require('chalk').yellow(`DONE: ${success} created, ${failed} failed`)}`);
    }
  },
};
