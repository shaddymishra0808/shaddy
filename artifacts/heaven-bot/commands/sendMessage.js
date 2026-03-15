const logger = require('../utils/logger');

module.exports = {
  name: 'sendMessage',
  description: 'Send a message to a channel',
  async execute(guild, args) {
    const channelId = args[0];
    const message = args.slice(1).join(' ');

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
      logger.error('Target channel is not a text channel');
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
