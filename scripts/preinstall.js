// scripts/preinstall.js

import fs from 'fs';
import path from 'path';

// Remove lock files if they exist
['package-lock.json', 'yarn.lock'].forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
});

// Check if using pnpm
const userAgent = process.env.npm_config_user_agent || '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}
