const chalk = require('chalk');
const logger = require('../utils/logger');

module.exports = {
  name: 'sendMessage',
  description: 'Send a message to a channel (pick from list or use ID)',
  async execute(guild, args, askFn) {
    let channelId = args[0];
    let message = args.slice(1).join(' ');

    // If askFn provided and no args, show interactive channel picker
    if (askFn && (!channelId || channelId === 'pick')) {
      const textChannels = [...guild.channels.cache.filter(c => c.isTextBased()).values()];

      if (textChannels.length === 0) {
        logger.error('No text channels found in this server.');
        return;
      }

      logger.divider();
      console.log(chalk.cyan.bold('  SELECT CHANNEL'));
      logger.divider();
      textChannels.forEach((c, i) => {
        console.log(`  ${chalk.green(`[${i + 1}]`)} ${chalk.white('#' + c.name)} ${chalk.gray(`— ${c.id}`)}`);
      });
      logger.divider();

      const pick = await askFn(chalk.cyan('  Channel number: '));
      const idx = parseInt(pick.trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= textChannels.length) {
        logger.error('Invalid selection.');
        return;
      }
      channelId = textChannels[idx].id;

      if (!message) {
        message = await askFn(chalk.cyan('  Message: '));
        message = message.trim();
      }
    }

    if (!channelId || !message) {
      logger.error('Usage: sendMessage <channelId> <message>');
      return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      logger.error(`Channel not found: ${channelId}`);
      return;
    }
    if (!channel.isTextBased()) {
      logger.error('Target channel is not a text channel.');
      return;
    }

    try {
      await channel.send(message);
      logger.success(`Message sent to #${channel.name}`);
    } catch (err) {
      logger.error(`Failed to send message: ${err.message}`);
    }
  },
};
