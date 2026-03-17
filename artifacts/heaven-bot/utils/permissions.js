const fs = require('fs');
const path = require('path');
const config = require('../config');

// When running as a pkg .exe, write data files beside the executable
const isPkg = typeof process.pkg !== 'undefined';
const dataDir = isPkg
  ? path.join(path.dirname(process.execPath), 'data')
  : path.join(__dirname, '../data');

const accessPath = path.join(dataDir, 'access.json');
const whitelistPath = path.join(dataDir, 'whitelist.json');

// Auto-create data directory and files if they don't exist (first run)
function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(accessPath)) fs.writeFileSync(accessPath, JSON.stringify({ users: [] }, null, 2));
  if (!fs.existsSync(whitelistPath)) fs.writeFileSync(whitelistPath, JSON.stringify({ users: [] }, null, 2));
}

ensureDataFiles();

let accessData = JSON.parse(fs.readFileSync(accessPath, 'utf8'));
let whitelistData = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));

const saveAccess = () => fs.writeFileSync(accessPath, JSON.stringify(accessData, null, 2));
const saveWhitelist = () => fs.writeFileSync(whitelistPath, JSON.stringify(whitelistData, null, 2));

const isAuthorized = (userId) => {
  return userId === config.ownerId || accessData.users.includes(userId);
};

const isWhitelisted = (userId) => {
  return userId === config.ownerId || whitelistData.users.includes(userId);
};

const isBot = (client, userId) => {
  return userId === client.user.id;
};

const addAccess = (userId) => {
  if (!accessData.users.includes(userId)) {
    accessData.users.push(userId);
    saveAccess();
    return true;
  }
  return false;
};

const removeAccess = (userId) => {
  const idx = accessData.users.indexOf(userId);
  if (idx > -1) {
    accessData.users.splice(idx, 1);
    saveAccess();
    return true;
  }
  return false;
};

const addWhitelist = (userId) => {
  if (!whitelistData.users.includes(userId)) {
    whitelistData.users.push(userId);
    saveWhitelist();
    return true;
  }
  return false;
};

const removeWhitelist = (userId) => {
  const idx = whitelistData.users.indexOf(userId);
  if (idx > -1) {
    whitelistData.users.splice(idx, 1);
    saveWhitelist();
    return true;
  }
  return false;
};

const getAccessList = () => ({ ...accessData });
const getWhitelist = () => ({ ...whitelistData });

const reload = () => {
  ensureDataFiles();
  accessData = JSON.parse(fs.readFileSync(accessPath, 'utf8'));
  whitelistData = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
};

module.exports = {
  isAuthorized,
  isWhitelisted,
  isBot,
  addAccess,
  removeAccess,
  addWhitelist,
  removeWhitelist,
  getAccessList,
  getWhitelist,
  reload,
};
