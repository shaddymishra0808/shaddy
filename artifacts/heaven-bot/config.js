require('dotenv').config();

module.exports = {
  prefix: process.env.PREFIX || '+',
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  ownerId: process.env.OWNER_ID,
};
