const chalk = require('chalk');
const logger = require('../utils/logger');
const permissions = require('../utils/permissions');

module.exports = {
  name: 'deleteRoles',
  description: 'Delete all roles (except @everyone and whitelisted)',
  async execute(guild) {
    const roles = guild.roles.cache.filter(r =>
      r.name !== '@everyone' &&
      !permissions.isWhitelisted(r.id) &&
      r.editable
    );

    if (roles.size === 0) {
      logger.warn('No deletable roles found.');
      return;
    }

    logger.info(`Deleting ${roles.size} roles...`);
    logger.divider();

    let success = 0;
    let failed = 0;
    const total = roles.size;
    const rolesArr = [...roles.values()];

    const BATCH = 5;
    for (let i = 0; i < rolesArr.length; i += BATCH) {
      const batch = rolesArr.slice(i, i + BATCH).map(role =>
        role.delete()
          .then(() => {
            success++;
            logger.success(`Role deleted: ${role.name}`);
            logger.progress(success + failed, total);
          })
          .catch(() => {
            failed++;
            logger.error(`Failed: ${role.name}`);
            logger.progress(success + failed, total);
          })
      );
      await Promise.all(batch);
    }

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: ${success}/${total} roles deleted`)}${failed ? chalk.yellow(` (${failed} failed)`) : ''}`);
  },
};
