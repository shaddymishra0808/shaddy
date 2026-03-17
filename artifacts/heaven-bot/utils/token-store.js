const fs = require('fs');
const path = require('path');

// When running as pkg .exe, save beside the executable; otherwise beside index.js
const isPkg = typeof process.pkg !== 'undefined';
const storeDir = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const storePath = path.join(storeDir, 'saved-token.json');

function loadToken() {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return data.token || null;
    }
  } catch {}
  return null;
}

function saveToken(token) {
  try {
    fs.writeFileSync(storePath, JSON.stringify({ token }, null, 2));
  } catch {}
}

function clearToken() {
  try {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
  } catch {}
}

module.exports = { loadToken, saveToken, clearToken };
