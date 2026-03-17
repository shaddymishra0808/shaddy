const path = require('path');
const tokenStore = require('./utils/token-store');

// Load .env only if it exists (optional — no need to create it manually)
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(__dirname, '.env');

require('dotenv').config({ path: envPath });

module.exports = {
  prefix: process.env.PREFIX || '+',
  // Priority: Replit Secret / .env → saved token file
  token: process.env.BOT_TOKEN || tokenStore.loadToken(),
  clientId: process.env.CLIENT_ID,
  ownerId: process.env.OWNER_ID,
};
