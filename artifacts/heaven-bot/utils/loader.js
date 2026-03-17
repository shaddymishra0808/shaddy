const chalk = require('chalk');

// Explicit static requires so pkg can bundle all commands into the .exe
const COMMANDS = [
  require('../commands/createChannels'),
  require('../commands/createRoles'),
  require('../commands/deleteAll'),
  require('../commands/deleteChannels'),
  require('../commands/deleteRoles'),
  require('../commands/memberTools'),
  require('../commands/sendMessage'),
  require('../commands/serverInfo'),
  require('../commands/spamAll'),
  require('../commands/spamChannel'),
  require('../commands/systemStats'),
];

const loadCommands = (commandsMap) => {
  commandsMap.clear();
  for (const cmd of COMMANDS) {
    commandsMap.set(cmd.name, cmd);
  }
  console.log(chalk.green(`[✓] Loaded ${commandsMap.size} commands`));
  return commandsMap;
};

module.exports = { loadCommands };
