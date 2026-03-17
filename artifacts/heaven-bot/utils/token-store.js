const fs = require('fs');
const path = require('path');

// When running as pkg .exe, save beside the executable; otherwise beside index.js
const isPkg = typeof process.pkg !== 'undefined';
const storeDir = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const storePath = path.join(storeDir, 'saved-token.json');
const envPath = path.join(storeDir, '.env');

// Update or create BOT_TOKEN line in .env file
function updateEnvFile(token) {
  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    if (content.match(/^BOT_TOKEN=.*/m)) {
      // Replace existing BOT_TOKEN line
      content = content.replace(/^BOT_TOKEN=.*/m, `BOT_TOKEN=${token}`);
    } else {
      // Add BOT_TOKEN line at the top
      content = `BOT_TOKEN=${token}\n` + content;
    }

    fs.writeFileSync(envPath, content, 'utf8');
  } catch {}
}

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
    // Save to JSON store
    fs.writeFileSync(storePath, JSON.stringify({ token }, null, 2));
    // Also update .env file automatically
    updateEnvFile(token);
  } catch {}
}

function clearToken() {
  try {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
  } catch {}
}

module.exports = { loadToken, saveToken, clearToken };
