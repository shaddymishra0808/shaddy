require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const config = require('./config');
const logger = require('./utils/logger');
const { loadCommands } = require('./utils/loader');
const permissions = require('./utils/permissions');

// ─── Validate Config ──────────────────────────────────────────────────────────
if (!config.token) { console.error(chalk.red('[✗] BOT_TOKEN is missing. Set it in .env or Replit Secrets.')); process.exit(1); }
if (!config.ownerId) { console.error(chalk.red('[✗] OWNER_ID is missing.')); process.exit(1); }

// ─── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ─── Command Registry (Map for O(1) lookup) ───────────────────────────────────
const commands = new Map();

// ─── State ─────────────────────────────────────────────────────────────────────
let selectedGuild = null;
let rl = null;

// ─── Banner ──────────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  console.log(chalk.green(''));
  console.log(chalk.green('  ██╗  ██╗███████╗ █████╗ ██╗   ██╗███████╗███╗   ██╗'));
  console.log(chalk.green('  ██║  ██║██╔════╝██╔══██╗██║   ██║██╔════╝████╗  ██║'));
  console.log(chalk.green('  ███████║█████╗  ███████║██║   ██║█████╗  ██╔██╗ ██║'));
  console.log(chalk.green('  ██╔══██║██╔══╝  ██╔══██║╚██╗ ██╔╝██╔══╝  ██║╚██╗██║'));
  console.log(chalk.green('  ██║  ██║███████╗██║  ██║ ╚████╔╝ ███████╗██║ ╚████║'));
  console.log(chalk.green('  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝'));
  console.log('');
  console.log(chalk.cyan('  ┌─────────────────────────────────────────────┐'));
  console.log(chalk.cyan('  │') + chalk.white.bold('        HEAVEN CONTROL PANEL v1.0            ') + chalk.cyan('│'));
  console.log(chalk.cyan('  │') + chalk.green('       Ultra Fast Execution Mode Enabled     ') + chalk.cyan('│'));
  console.log(chalk.cyan('  │') + chalk.gray('       Node.js  •  discord.js v14            ') + chalk.cyan('│'));
  console.log(chalk.cyan('  └─────────────────────────────────────────────┘'));
  console.log('');
}

// ─── Server Selection ─────────────────────────────────────────────────────────
async function selectServer() {
  const guilds = [...client.guilds.cache.values()];

  if (guilds.length === 0) {
    logger.error('Bot is not in any servers. Invite the bot first.');
    process.exit(1);
  }

  console.log(chalk.cyan.bold('  AVAILABLE SERVERS'));
  logger.divider();
  guilds.forEach((g, i) => {
    console.log(`  ${chalk.green(`[${i + 1}]`)} ${chalk.white(g.name)} ${chalk.gray(`— ${g.id}`)} ${chalk.yellow(`(${g.memberCount} members)`)}`);
  });
  logger.divider();
  console.log('');

  return new Promise((resolve) => {
    rl.question(chalk.cyan('  Select server number: '), (answer) => {
      const idx = parseInt(answer.trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= guilds.length) {
        logger.error('Invalid selection. Try again.');
        resolve(selectServer());
      } else {
        const guild = guilds[idx];
        console.log('');
        console.log(chalk.green(`  ✓ CONNECTED TO: ${chalk.white.bold(guild.name)}`));
        logger.divider();
        resolve(guild);
      }
    });
  });
}

// ─── Main Menu ────────────────────────────────────────────────────────────────
function printMenu() {
  console.log('');
  console.log(chalk.cyan.bold('  ── COMMAND MENU ──────────────────────────────'));
  console.log(`  ${chalk.green('[1]')} ${chalk.white('Create channels')}       ${chalk.green('[6]')} ${chalk.white('Show access list')}`);
  console.log(`  ${chalk.green('[2]')} ${chalk.white('Create roles')}          ${chalk.green('[7]')} ${chalk.white('Show whitelist')}`);
  console.log(`  ${chalk.green('[3]')} ${chalk.white('Server information')}    ${chalk.green('[8]')} ${chalk.white('Reload commands')}`);
  console.log(`  ${chalk.green('[4]')} ${chalk.white('Member list')}           ${chalk.green('[9]')} ${chalk.white('System stats')}`);
  console.log(`  ${chalk.green('[5]')} ${chalk.white('Send message')}          ${chalk.red('[0]')} ${chalk.white('Exit')}`);
  console.log(chalk.cyan('  ────────────────────────────────────────────────'));
  console.log('');
}

// ─── Prompt Helper ────────────────────────────────────────────────────────────
function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ─── Access & Whitelist Display ───────────────────────────────────────────────
function showAccessList() {
  const list = permissions.getAccessList();
  logger.divider();
  console.log(chalk.cyan.bold('  ACCESS LIST'));
  logger.divider();
  if (list.users.length === 0) {
    console.log(chalk.gray('  No additional users. Only owner has access.'));
  } else {
    list.users.forEach((id, i) => console.log(`  ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));
  }
  logger.divider();
}

function showWhitelist() {
  const list = permissions.getWhitelist();
  logger.divider();
  console.log(chalk.cyan.bold('  WHITELIST'));
  logger.divider();
  if (list.users.length === 0) {
    console.log(chalk.gray('  Whitelist is empty.'));
  } else {
    list.users.forEach((id, i) => console.log(`  ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));
  }
  logger.divider();
}

// ─── Command Input Handler ────────────────────────────────────────────────────
async function handleMenuInput(choice) {
  console.log('');

  switch (choice.trim()) {
    case '1': {
      const input = await ask(chalk.cyan('  createChannels ') + chalk.gray('<count> <name>: '));
      const [count, ...nameParts] = input.trim().split(/\s+/);
      await commands.get('createChannels').execute(selectedGuild, [count, nameParts.join('-') || 'channel']);
      break;
    }
    case '2': {
      const input = await ask(chalk.cyan('  createRoles ') + chalk.gray('<count> <name>: '));
      const [count, ...nameParts] = input.trim().split(/\s+/);
      await commands.get('createRoles').execute(selectedGuild, [count, nameParts.join('-') || 'role']);
      break;
    }
    case '3':
      await commands.get('serverInfo').execute(selectedGuild);
      break;
    case '4':
      await commands.get('memberTools').execute(selectedGuild);
      break;
    case '5': {
      const input = await ask(chalk.cyan('  sendMessage ') + chalk.gray('<channelId> <message>: '));
      const [channelId, ...msgParts] = input.trim().split(/\s+/);
      await commands.get('sendMessage').execute(selectedGuild, [channelId, ...msgParts]);
      break;
    }
    case '6':
      showAccessList();
      break;
    case '7':
      showWhitelist();
      break;
    case '8':
      loadCommands(commands);
      logger.success('Commands reloaded successfully');
      break;
    case '9':
      await commands.get('systemStats').execute(client);
      break;
    case '0':
      console.log(chalk.red('\n  [!] Shutting down HEAVEN CONTROL PANEL...\n'));
      client.destroy();
      process.exit(0);
      break;
    default:
      logger.warn(`Unknown option: "${choice}". Enter a number from the menu.`);
  }
}

// ─── Interactive Loop ─────────────────────────────────────────────────────────
async function startControlPanel() {
  printMenu();

  const loop = async () => {
    const choice = await ask(chalk.green('  heaven') + chalk.gray('@') + chalk.cyan(selectedGuild.name.replace(/\s/g, '-').toLowerCase()) + chalk.white(' > '));
    await handleMenuInput(choice);
    loop();
  };

  loop();
}

// ─── Discord Events ───────────────────────────────────────────────────────────
client.once('ready', async () => {
  printBanner();
  logger.success(`Logged in as ${chalk.white.bold(client.user.tag)}`);
  logger.info(`Ping: ${chalk.yellow(client.ws.ping + 'ms')}`);
  logger.info(`Guilds: ${chalk.yellow(client.guilds.cache.size)}`);
  console.log('');

  loadCommands(commands);

  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => { console.log(chalk.red('\n  [!] Terminal closed. Shutting down.')); process.exit(0); });

  selectedGuild = await selectServer();
  await startControlPanel();
});

client.on('error', (err) => logger.error(`Discord error: ${err.message}`));
client.on('warn', (msg) => logger.warn(msg));

// ─── Prefix command listener (from Discord) ───────────────────────────────────
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(config.prefix)) return;
  if (message.author.bot) return;
  if (!permissions.isAuthorized(message.author.id)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const cmdName = args.shift();
  const cmd = commands.get(cmdName);
  if (!cmd) return;

  const guild = message.guild;
  if (!guild) return;

  try {
    if (cmdName === 'systemStats') await cmd.execute(client);
    else await cmd.execute(guild, args);
  } catch (err) {
    logger.error(`Command error (${cmdName}): ${err.message}`);
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const spinner = ora({ text: chalk.cyan('Connecting to Discord...'), color: 'cyan' }).start();
client.login(config.token)
  .then(() => spinner.succeed(chalk.green('Connected to Discord')))
  .catch((err) => {
    spinner.fail(chalk.red(`Login failed: ${err.message}`));
    process.exit(1);
  });
