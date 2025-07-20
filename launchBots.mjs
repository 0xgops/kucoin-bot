// launchBots.mjs
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const BOT_FOLDER = './bots';
const MAX_BOTS = 3;

// 🔪 Kill old Node bot processes
try {
  console.log('🛑 Killing previous bot processes...');
  execSync(`pkill -f "node index.mjs"`);
} catch (e) {
  console.log('⚠️ No old bots to kill.');
}

// 🚀 Launch fresh bots
for (let i = 1; i <= MAX_BOTS; i++) {
  const botDir = path.join(BOT_FOLDER, `bot${i}`);
  const envPath = path.join(botDir, '.env');

  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ Skipping bot${i}, no .env file found.`);
    continue;
  }

  console.log(`🚀 Launching bot ${i} → ${path.basename(botDir)}`);
  spawn('node', ['index.mjs'], {
    cwd: botDir,
    env: { ...process.env, ...parseEnv(envPath) },
    stdio: 'inherit',
  });
}

// 🧪 Helper to parse .env manually
function parseEnv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  }
  return env;
}