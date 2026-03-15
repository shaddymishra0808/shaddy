const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const loadCommands = (commandsMap) => {
  const commandsDir = path.join(__dirname, '../commands');
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

  commandsMap.clear();
  for (const file of files) {
    delete require.cache[require.resolve(path.join(commandsDir, file))];
    const cmd = require(path.join(commandsDir, file));
    commandsMap.set(cmd.name, cmd);
  }

  console.log(chalk.green(`[✓] Loaded ${commandsMap.size} commands`));
  return commandsMap;
};

module.exports = { loadCommands };
