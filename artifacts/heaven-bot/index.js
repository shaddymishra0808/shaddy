require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const config = require('./config');
const logger = require('./utils/logger');
const { loadCommands } = require('./utils/loader');
const permissions = require('./utils/permissions');

// ─── Command Registry ─────────────────────────────────────────────────────────
const commands = new Map();

// ─── Shared readline (created once, lives forever) ────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('close', () => { console.log(chalk.red('\n  [!] Terminal closed. Shutting down.')); process.exit(0); });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ─── Banner ───────────────────────────────────────────────────────────────────
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
async function selectServer(client) {
  const guilds = [...client.guilds.cache.values()];

  if (guilds.length === 0) {
    logger.error('Bot is not in any servers. Invite the bot first.');
    const retry = await ask(chalk.yellow('  Press Enter to try again, or type "back" to switch token: '));
    if (retry.trim().toLowerCase() === 'back') return null;
    return selectServer(client);
  }

  console.log(chalk.cyan.bold('  AVAILABLE SERVERS'));
  logger.divider();
  guilds.forEach((g, i) => {
    console.log(`  ${chalk.green(`[${i + 1}]`)} ${chalk.white(g.name)} ${chalk.gray(`— ${g.id}`)} ${chalk.yellow(`(${g.memberCount} members)`)}`);
  });
  logger.divider();
  console.log('');

  const answer = await ask(chalk.cyan('  Select server number: '));
  const idx = parseInt(answer.trim()) - 1;
  if (isNaN(idx) || idx < 0 || idx >= guilds.length) {
    logger.error('Invalid selection. Try again.');
    return selectServer(client);
  }
  const guild = guilds[idx];
  console.log('');
  console.log(chalk.green(`  ✓ CONNECTED TO: ${chalk.white.bold(guild.name)}`));
  logger.divider();
  return guild;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function printMenu(botTag, guildName) {
  console.log('');
  console.log(chalk.cyan.bold('  ── COMMAND MENU ──────────────────────────────'));
  console.log(`  ${chalk.green('[1]')} ${chalk.white('Create channels')}       ${chalk.green('[6]')} ${chalk.white('Show access list')}`);
  console.log(`  ${chalk.green('[2]')} ${chalk.white('Create roles')}          ${chalk.green('[7]')} ${chalk.white('Show whitelist')}`);
  console.log(`  ${chalk.green('[3]')} ${chalk.white('Server information')}    ${chalk.green('[8]')} ${chalk.white('Reload commands')}`);
  console.log(`  ${chalk.green('[4]')} ${chalk.white('Member list')}           ${chalk.green('[9]')} ${chalk.white('System stats')}`);
  console.log(`  ${chalk.green('[5]')} ${chalk.white('Send message')}          ${chalk.green('[s]')} ${chalk.white('Switch server')}`);
  console.log(`  ${chalk.yellow('[t]')} ${chalk.yellow('Switch bot token')}      ${chalk.red('[0]')} ${chalk.white('Exit')}`);
  console.log(chalk.cyan('  ────────────────────────────────────────────────'));
  console.log(chalk.gray(`  Logged in as: ${botTag}  |  Server: ${guildName}`));
  console.log('');
}

// ─── Access / Whitelist ───────────────────────────────────────────────────────
function showAccessList() {
  const list = permissions.getAccessList();
  logger.divider();
  console.log(chalk.cyan.bold('  ACCESS LIST'));
  logger.divider();
  if (list.users.length === 0) console.log(chalk.gray('  No additional users. Only owner has access.'));
  else list.users.forEach((id, i) => console.log(`  ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));
  logger.divider();
}

function showWhitelist() {
  const list = permissions.getWhitelist();
  logger.divider();
  console.log(chalk.cyan.bold('  WHITELIST'));
  logger.divider();
  if (list.users.length === 0) console.log(chalk.gray('  Whitelist is empty.'));
  else list.users.forEach((id, i) => console.log(`  ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));
  logger.divider();
}

// ─── Switch Token ─────────────────────────────────────────────────────────────
async function switchToken(currentClient) {
  logger.divider();
  console.log(chalk.yellow.bold('  SWITCH BOT TOKEN'));
  logger.divider();
  console.log(chalk.gray('  Enter a new bot token to re-login, or leave blank to cancel.'));
  console.log('');

  const token = await ask(chalk.yellow('  New bot token: '));
  const trimmed = token.trim();

  if (!trimmed) {
    logger.warn('Cancelled. Keeping current session.');
    return null;
  }

  // Basic token format check (three parts separated by dots)
  if (trimmed.split('.').length < 3) {
    logger.error('That does not look like a valid bot token.');
    return null;
  }

  const spinner = ora({ text: chalk.cyan('Disconnecting current session...'), color: 'cyan' }).start();
  try {
    currentClient.removeAllListeners();
    await currentClient.destroy();
    spinner.succeed(chalk.green('Disconnected'));
  } catch {
    spinner.warn(chalk.yellow('Could not cleanly disconnect'));
  }

  return trimmed;
}

// ─── Create & Boot a Client ───────────────────────────────────────────────────
function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
  });
}

async function loginClient(client, token) {
  const spinner = ora({ text: chalk.cyan('Connecting to Discord...'), color: 'cyan' }).start();
  await client.login(token);
  await new Promise((resolve) => client.once('clientReady', resolve));
  spinner.succeed(chalk.green(`Logged in as ${chalk.white.bold(client.user.tag)}`));
}

// ─── Main Control Panel Loop ──────────────────────────────────────────────────
async function runControlPanel(client, guild) {
  loadCommands(commands);
  printMenu(client.user.tag, guild.name);

  const prompt = () =>
    chalk.green('  heaven') +
    chalk.gray('@') +
    chalk.cyan(guild.name.replace(/\s/g, '-').toLowerCase()) +
    chalk.white(' > ');

  while (true) {
    const choice = await ask(prompt());
    console.log('');

    switch (choice.trim().toLowerCase()) {
      case '1': {
        const input = await ask(chalk.cyan('  createChannels ') + chalk.gray('<count> <name>: '));
        const [count, ...nameParts] = input.trim().split(/\s+/);
        await commands.get('createChannels').execute(guild, [count, nameParts.join('-') || 'channel']);
        break;
      }
      case '2': {
        const input = await ask(chalk.cyan('  createRoles ') + chalk.gray('<count> <name>: '));
        const [count, ...nameParts] = input.trim().split(/\s+/);
        await commands.get('createRoles').execute(guild, [count, nameParts.join('-') || 'role']);
        break;
      }
      case '3':
        await commands.get('serverInfo').execute(guild);
        break;
      case '4':
        await commands.get('memberTools').execute(guild);
        break;
      case '5': {
        const input = await ask(chalk.cyan('  sendMessage ') + chalk.gray('<channelId> <message>: '));
        const [channelId, ...msgParts] = input.trim().split(/\s+/);
        await commands.get('sendMessage').execute(guild, [channelId, ...msgParts]);
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
        logger.success('Commands reloaded');
        break;
      case '9':
        await commands.get('systemStats').execute(client);
        break;
      case 's': {
        // Switch server without switching token
        const newGuild = await selectServer(client);
        if (newGuild) {
          guild = newGuild;
          printMenu(client.user.tag, guild.name);
        }
        break;
      }
      case 't': {
        const newToken = await switchToken(client);
        if (newToken) {
          // Return signal to outer boot loop
          return { action: 'switchToken', token: newToken };
        }
        break;
      }
      case '0':
        console.log(chalk.red('\n  [!] Shutting down HEAVEN CONTROL PANEL...\n'));
        client.destroy();
        process.exit(0);
        break;
      default:
        logger.warn(`Unknown option: "${choice}". Enter a number or letter from the menu.`);
    }
  }
}

// ─── Boot Loop ────────────────────────────────────────────────────────────────
async function boot(token) {
  printBanner();

  const client = createClient();

  client.on('error', (err) => logger.error(`Discord error: ${err.message}`));
  client.on('warn', (msg) => logger.warn(msg));

  // Discord message prefix handler
  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(config.prefix)) return;
    if (message.author.bot) return;
    if (!permissions.isAuthorized(message.author.id)) return;
    const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const cmdName = args.shift();
    const cmd = commands.get(cmdName);
    if (!cmd || !message.guild) return;
    try {
      if (cmdName === 'systemStats') await cmd.execute(client);
      else await cmd.execute(message.guild, args);
    } catch (err) {
      logger.error(`Command error (${cmdName}): ${err.message}`);
    }
  });

  try {
    await loginClient(client, token);
  } catch (err) {
    console.log(chalk.red(`\n  [✗] Login failed: ${err.message}`));
    console.log(chalk.gray('  Check the token and try again.\n'));

    const retry = await ask(chalk.yellow('  Enter a different token, or press Enter to exit: '));
    const trimmed = retry.trim();
    if (!trimmed) process.exit(1);
    return boot(trimmed);
  }

  logger.info(`Ping: ${chalk.yellow(client.ws.ping + 'ms')}`);
  logger.info(`Guilds: ${chalk.yellow(client.guilds.cache.size)}`);
  console.log('');

  const guild = await selectServer(client);
  if (!guild) {
    // User typed "back" on empty server list — ask for token
    const newToken = await ask(chalk.yellow('  Enter new bot token: '));
    if (newToken.trim()) {
      client.removeAllListeners();
      await client.destroy();
      return boot(newToken.trim());
    }
    process.exit(0);
  }

  const result = await runControlPanel(client, guild);

  if (result?.action === 'switchToken') {
    return boot(result.token);
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
if (!config.token) {
  printBanner();
  console.log(chalk.yellow('  No BOT_TOKEN found in environment.\n'));
  ask(chalk.yellow('  Enter bot token to continue: ')).then((token) => {
    const trimmed = token.trim();
    if (!trimmed) { logger.error('No token provided. Exiting.'); process.exit(1); }
    boot(trimmed);
  });
} else {
  boot(config.token);
}
