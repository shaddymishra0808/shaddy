const { Client, GatewayIntentBits, Partials, Options } = require('discord.js');
const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const config = require('./config');
const logger = require('./utils/logger');
const { loadCommands } = require('./utils/loader');
const permissions = require('./utils/permissions');
const tokenStore = require('./utils/token-store');

// ─── Command Registry ─────────────────────────────────────────────────────────
const commands = new Map();

// ─── Crash Protection ─────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`);
});

// ─── Resilient readline (recreates if stdin closes unexpectedly) ──────────────
let rl = null;

function getRL() {
  if (!rl || rl.closed) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.on('close', () => {
      rl = null;
    });
  }
  return rl;
}

function ask(question) {
  return new Promise((resolve) => {
    const iface = getRL();
    iface.question(question, (ans) => resolve(ans));
  });
}

// Graceful shutdown only on explicit signals
process.on('SIGINT', () => { console.log(chalk.red('\n  [!] SIGINT received. Shutting down.')); process.exit(0); });
process.on('SIGTERM', () => { console.log(chalk.red('\n  [!] SIGTERM received. Shutting down.')); process.exit(0); });

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
  console.log(chalk.cyan('  ╔═════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.white.bold('        HEAVEN CONTROL PANEL  v1.0           ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ║') + chalk.green('       Ultra Fast Execution Mode Enabled     ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ║') + chalk.gray('       Node.js  •  discord.js v14            ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╠═════════════════════════════════════════════╣'));
  console.log(chalk.cyan('  ║') + chalk.gray('                                             ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ║') + chalk.gray('         Developed & Designed by  ') + chalk.magenta.bold('Zabro') + chalk.gray('       ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ║') + chalk.gray('                                             ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╚═════════════════════════════════════════════╝'));
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
  console.log(chalk.cyan.bold('  ── COMMAND MENU ──────────────────────────────────────'));
  console.log(`  ${chalk.green('[1]')}  ${chalk.white('Create channels')}        ${chalk.green('[8]')}  ${chalk.white('Reload commands')}`);
  console.log(`  ${chalk.green('[2]')}  ${chalk.white('Create roles')}           ${chalk.green('[9]')}  ${chalk.white('System stats')}`);
  console.log(`  ${chalk.green('[3]')}  ${chalk.white('Server information')}     ${chalk.green('[s]')}  ${chalk.white('Switch server')}`);
  console.log(`  ${chalk.green('[4]')}  ${chalk.white('Member list')}            ${chalk.yellow('[t]')}  ${chalk.yellow('Switch bot token')}`);
  console.log(`  ${chalk.green('[5]')}  ${chalk.white('Send message')}           ${chalk.green('[6]')}  ${chalk.white('Show access list')}`);
  console.log(`  ${chalk.red('[d1]')} ${chalk.red('Delete all channels')}    ${chalk.green('[7]')}  ${chalk.white('Show whitelist')}`);
  console.log(`  ${chalk.red('[d2]')} ${chalk.red('Delete all roles')}       ${chalk.red('[d3]')} ${chalk.red('NUKE (channels+roles)')}`);
  console.log(`  ${chalk.magenta('[sp]')} ${chalk.magenta('Spam a channel')}        ${chalk.magenta('[sa]')} ${chalk.magenta('Spam ALL channels')}`);
  console.log(`  ${chalk.red('[0]')}  ${chalk.white('Exit')}`);
  console.log(chalk.cyan('  ──────────────────────────────────────────────────────'));
  console.log(chalk.gray(`  Bot: ${botTag}  |  Server: ${guildName}`));
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
    // ── Performance & reliability tweaks ──────────────────────────────────
    rest: {
      timeout: 60_000,      // wait up to 60 s for slow Discord API responses
      retryLimit: 5,        // retry rate-limited / transient errors up to 5 times
    },
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 50,   // only keep last 50 messages per channel in RAM
      ReactionManager: 0,   // no reaction caching needed
      GuildStickerManager: 0,
      GuildScheduledEventManager: 0,
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: { interval: 300, lifetime: 600 }, // sweep old messages every 5 min
      users:    { interval: 300, filter: () => (u) => u.bot && u.id !== u.client.user.id },
    },
  });
}

async function loginClient(client, token) {
  const spinner = ora({ text: chalk.cyan('Connecting to Discord...'), color: 'cyan' }).start();
  const readyPromise = new Promise((resolve, reject) => {
    client.once('clientReady', resolve);
    client.once('error', reject);
    setTimeout(() => reject(new Error('Login timed out after 30s')), 30000);
  });
  await client.login(token);
  await readyPromise;
  spinner.succeed(chalk.green(`Logged in as ${chalk.white.bold(client.user.tag)}`));
}

// ─── Auto-reconnect on disconnect ─────────────────────────────────────────────
function attachReconnectHandler(client, token) {
  client.on('shardDisconnect', (event, id) => {
    logger.warn(`Shard ${id} disconnected (code ${event.code}). Reconnecting...`);
  });
  client.on('shardReconnecting', (id) => {
    logger.info(`Shard ${id} reconnecting...`);
  });
  client.on('shardResume', (id, replayed) => {
    logger.success(`Shard ${id} resumed (${replayed} events replayed)`);
  });
  client.on('shardError', (err, id) => {
    logger.error(`Shard ${id} error: ${err.message}`);
  });
}

// ─── Post-command pause ───────────────────────────────────────────────────────
async function afterCommand() {
  console.log('');
  console.log(chalk.cyan('  ────────────────────────────────────────────────'));
  const ans = await ask(
    chalk.gray('  [Enter] ') + chalk.white('Back to menu') +
    chalk.gray('   [0] ') + chalk.red('Exit') +
    chalk.gray('   [m] ') + chalk.cyan('Show menu') +
    '  → '
  );
  const val = ans.trim().toLowerCase();
  if (val === '0') {
    console.log(chalk.red('\n  [!] Shutting down HEAVEN CONTROL PANEL...\n'));
    process.exit(0);
  }
  if (val === 'm') return 'menu';
  return 'continue';
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
        const r1 = await afterCommand();
        if (r1 === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case '2': {
        const input = await ask(chalk.cyan('  createRoles ') + chalk.gray('<count> <name>: '));
        const [count, ...nameParts] = input.trim().split(/\s+/);
        await commands.get('createRoles').execute(guild, [count, nameParts.join('-') || 'role']);
        const r2 = await afterCommand();
        if (r2 === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case '3':
        await commands.get('serverInfo').execute(guild);
        { const r = await afterCommand(); if (r === 'menu') printMenu(client.user.tag, guild.name); }
        break;
      case '4':
        await commands.get('memberTools').execute(guild);
        { const r = await afterCommand(); if (r === 'menu') printMenu(client.user.tag, guild.name); }
        break;
      case '5': {
        await commands.get('sendMessage').execute(guild, ['pick'], ask);
        const r5 = await afterCommand();
        if (r5 === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case '6':
        showAccessList();
        { const r = await afterCommand(); if (r === 'menu') printMenu(client.user.tag, guild.name); }
        break;
      case '7':
        showWhitelist();
        { const r = await afterCommand(); if (r === 'menu') printMenu(client.user.tag, guild.name); }
        break;
      case '8':
        loadCommands(commands);
        logger.success('Commands reloaded');
        { const r = await afterCommand(); if (r === 'menu') printMenu(client.user.tag, guild.name); }
        break;
      case '9':
        await commands.get('systemStats').execute(client);
        { const r = await afterCommand(); if (r === 'menu') printMenu(client.user.tag, guild.name); }
        break;
      case 'd1': {
        logger.warn('This will delete ALL channels. Type "yes" to confirm: ');
        const c1 = await ask(chalk.red('  Confirm (yes): '));
        if (c1.trim().toLowerCase() === 'yes') {
          await commands.get('deleteChannels').execute(guild);
        } else { logger.warn('Cancelled.'); }
        const rd1 = await afterCommand();
        if (rd1 === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case 'd2': {
        logger.warn('This will delete ALL roles. Type "yes" to confirm: ');
        const c2 = await ask(chalk.red('  Confirm (yes): '));
        if (c2.trim().toLowerCase() === 'yes') {
          await commands.get('deleteRoles').execute(guild);
        } else { logger.warn('Cancelled.'); }
        const rd2 = await afterCommand();
        if (rd2 === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case 'd3': {
        logger.warn('NUKE: Delete ALL channels + ALL roles. Type "nuke" to confirm: ');
        const c3 = await ask(chalk.red('  Confirm (nuke): '));
        if (c3.trim().toLowerCase() === 'nuke') {
          await commands.get('deleteAll').execute(guild);
        } else { logger.warn('Cancelled.'); }
        const rd3 = await afterCommand();
        if (rd3 === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case 'sp': {
        const textChannels = [...guild.channels.cache.filter(c => c.isTextBased()).values()];
        logger.divider();
        console.log(chalk.magenta.bold('  SELECT CHANNEL TO SPAM'));
        logger.divider();
        textChannels.forEach((c, i) => {
          console.log(`  ${chalk.green(`[${i + 1}]`)} ${chalk.white('#' + c.name)} ${chalk.gray(`— ${c.id}`)}`);
        });
        logger.divider();
        const spPick = await ask(chalk.cyan('  Channel number: '));
        const spIdx = parseInt(spPick.trim()) - 1;
        if (isNaN(spIdx) || spIdx < 0 || spIdx >= textChannels.length) {
          logger.error('Invalid selection.'); break;
        }
        const spChannel = textChannels[spIdx];
        const spCount = await ask(chalk.cyan('  How many times: '));
        const spMsg = await ask(chalk.cyan('  Message: '));
        await commands.get('spamChannel').execute(guild, [spChannel.id, spCount.trim(), ...spMsg.trim().split(' ')]);
        const rsp = await afterCommand();
        if (rsp === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case 'sa': {
        const saCount = await ask(chalk.cyan('  Messages per channel: '));
        const saMsg = await ask(chalk.cyan('  Message: '));
        await commands.get('spamAll').execute(guild, [saCount.trim(), ...saMsg.trim().split(' ')]);
        const rsa = await afterCommand();
        if (rsa === 'menu') printMenu(client.user.tag, guild.name);
        break;
      }
      case 's': {
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

  attachReconnectHandler(client, token);

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
    tokenStore.saveToken(trimmed);
    logger.success('Token saved — will auto-load next time.');
    return boot(trimmed);
  }

  logger.info(`Ping: ${chalk.yellow(client.ws.ping + 'ms')}`);
  logger.info(`Guilds: ${chalk.yellow(client.guilds.cache.size)}`);
  console.log('');

  const guild = await selectServer(client);
  if (!guild) {
    const newToken = await ask(chalk.yellow('  Enter new bot token: '));
    if (newToken.trim()) {
      tokenStore.saveToken(newToken.trim());
      logger.success('Token saved — will auto-load next time.');
      client.removeAllListeners();
      await client.destroy();
      return boot(newToken.trim());
    }
    process.exit(0);
  }

  const result = await runControlPanel(client, guild);

  if (result?.action === 'switchToken') {
    tokenStore.saveToken(result.token);
    logger.success('Token saved — will auto-load next time.');
    return boot(result.token);
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
if (!config.token) {
  printBanner();
  console.log(chalk.yellow('  No saved token found.\n'));
  ask(chalk.yellow('  Enter bot token to continue: ')).then((token) => {
    const trimmed = token.trim();
    if (!trimmed) { logger.error('No token provided. Exiting.'); process.exit(1); }
    tokenStore.saveToken(trimmed);
    logger.success('Token saved — will auto-load next time.');
    boot(trimmed);
  });
} else {
  boot(config.token);
}
