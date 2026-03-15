const chalk = require('chalk');
const logger = require('../utils/logger');
const deleteChannels = require('./deleteChannels');
const deleteRoles = require('./deleteRoles');

module.exports = {
  name: 'deleteAll',
  description: 'Delete ALL channels and roles at once',
  async execute(guild) {
    logger.divider();
    console.log(chalk.red.bold('  NUKE MODE — Deleting ALL channels + roles'));
    logger.divider();

    console.log(chalk.yellow('  ► Phase 1: Deleting all channels...'));
    await deleteChannels.execute(guild);

    console.log('');
    console.log(chalk.yellow('  ► Phase 2: Deleting all roles...'));
    await deleteRoles.execute(guild);

    logger.divider();
    console.log(chalk.red.bold('  NUKE COMPLETE'));
    logger.divider();
  },
};
