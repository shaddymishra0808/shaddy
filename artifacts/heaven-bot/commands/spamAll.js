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
  name: 'spamAll',
  description: 'Spam ALL text channels simultaneously',
  async execute(guild, args) {
    const count = parseInt(args[0]);
    const message = args.slice(1).join(' ');

    if (isNaN(count) || !message) {
      logger.error('Usage: spamAll <count> <message>');
      return;
    }
    if (count < 1 || count > 500) {
      logger.error('Count must be between 1 and 500.');
      return;
    }

    const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));

    if (textChannels.size === 0) {
      logger.error('No accessible text channels found.');
      return;
    }

    logger.info(`Spamming ${textChannels.size} channels × ${count} messages each...`);
    logger.divider();

    let totalSent = 0;
    let totalFailed = 0;
    const totalExpected = textChannels.size * count;

    const channelTasks = [...textChannels.values()].map(async (channel) => {
      const BATCH = 10;
      for (let i = 0; i < count; i += BATCH) {
        const batchSize = Math.min(BATCH, count - i);
        const batch = Array.from({ length: batchSize }, () =>
          withRetry(() => channel.send(message))
            .then(() => {
              totalSent++;
              logger.progress(totalSent + totalFailed, totalExpected, `#${channel.name}`);
            })
            .catch(() => {
              totalFailed++;
              logger.progress(totalSent + totalFailed, totalExpected, `#${channel.name}`);
            })
        );
        await Promise.all(batch);
      }
    });

    await Promise.all(channelTasks);

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: ${totalSent}/${totalExpected} messages sent across ${textChannels.size} channels`)}`);
  },
};
