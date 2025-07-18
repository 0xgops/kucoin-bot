// launchBots.mjs
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const pairs = ['PEPE-USDT', 'SUI-USDT', 'TURBO-USDT']; // Replace with your desired symbols
const botCount = pairs.length;
const delays = [0, 3000, 6000]; // Staggered start

for (let i = 0; i < botCount; i++) {
  const botDir = path.join('./bots', `bot${i + 1}`);
  const envPath = path.join(botDir, '.env');

  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ Bot ${i + 1}: .env not found, skipping.`);
    continue;
  }

  const env = Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim()];
      })
  );

  const delay = delays[i] || 0;
  setTimeout(() => {
    console.log(`🚀 Launching bot ${i + 1} → ${env.SYMBOL}`);
    const child = spawn('node', ['index.mjs'], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });

    child.on('exit', code => {
      console.error(`❌ Bot ${env.BOT_NAME} exited with code ${code}`);
    });
  }, delay);
}