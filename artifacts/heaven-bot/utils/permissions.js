const fs = require('fs');
const path = require('path');
const config = require('../config');

const accessPath = path.join(__dirname, '../data/access.json');
const whitelistPath = path.join(__dirname, '../data/whitelist.json');

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
