const fs = require('fs');
const path = require('path');

// When running as pkg .exe, save beside the executable; otherwise beside index.js
const isPkg = typeof process.pkg !== 'undefined';
const storeDir = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const storePath = path.join(storeDir, 'saved-token.json');
const envPath   = path.join(storeDir, '.env');
const batPath   = path.join(storeDir, 'run.bat');
const ps1Path   = path.join(storeDir, 'start.ps1');

// ─── .env ─────────────────────────────────────────────────────────────────────
function updateEnvFile(token) {
  try {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (content.match(/^BOT_TOKEN=.*/m)) {
      content = content.replace(/^BOT_TOKEN=.*/m, `BOT_TOKEN=${token}`);
    } else {
      content = `BOT_TOKEN=${token}\n` + content;
    }
    fs.writeFileSync(envPath, content, 'utf8');
  } catch {}
}

// ─── run.bat ──────────────────────────────────────────────────────────────────
function updateBatFile(token) {
  try {
    if (!fs.existsSync(batPath)) return;
    let content = fs.readFileSync(batPath, 'utf8');
    content = content.replace(/^set BOT_TOKEN=.*/m, `set BOT_TOKEN=${token}`);
    fs.writeFileSync(batPath, content, 'utf8');
  } catch {}
}

// ─── start.ps1 ────────────────────────────────────────────────────────────────
function updatePs1File(token) {
  try {
    if (!fs.existsSync(ps1Path)) return;
    let content = fs.readFileSync(ps1Path, 'utf8');
    content = content.replace(/^\$env:BOT_TOKEN = ".*"/m, `$env:BOT_TOKEN = "${token}"`);
    fs.writeFileSync(ps1Path, content, 'utf8');
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────
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
    updateEnvFile(token);
    updateBatFile(token);
    updatePs1File(token);
  } catch {}
}

function clearToken() {
  try {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
  } catch {}
}

module.exports = { loadToken, saveToken, clearToken };
