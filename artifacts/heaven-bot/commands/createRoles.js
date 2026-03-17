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
  name: 'createRoles',
  description: 'Create multiple roles with a base name',
  async execute(guild, args) {
    const count = parseInt(args[0]);
    const baseName = args[1] || 'role';

    if (isNaN(count) || count < 1 || count > 250) {
      logger.error('Usage: createRoles <count> <name>  (count must be 1–250)');
      return;
    }

    logger.info(`Creating ${count} roles with base name "${baseName}"...`);
    logger.divider();

    let success = 0;
    let failed = 0;

    const BATCH = 10;
    for (let i = 0; i < count; i += BATCH) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH, count); j++) {
        const name = `${baseName}-${j + 1}`;
        batch.push(
          withRetry(() => guild.roles.create({ name }))
            .then(() => {
              success++;
              logger.success(`Role created: ${name}`);
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
      console.log(`\n${require('chalk').green(`SUCCESS: ${success}/${count} roles created`)}`);
    } else {
      console.log(`\n${require('chalk').yellow(`DONE: ${success} created, ${failed} failed`)}`);
    }
  },
};
