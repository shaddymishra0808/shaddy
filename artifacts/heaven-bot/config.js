const path = require('path');

// When running as a pkg .exe, load .env from beside the executable
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(__dirname, '.env');

require('dotenv').config({ path: envPath });

module.exports = {
  prefix: process.env.PREFIX || '+',
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  ownerId: process.env.OWNER_ID,
};
