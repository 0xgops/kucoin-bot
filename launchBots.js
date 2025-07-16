const { spawn } = require('child_process');

const pairs = ['PEPE-USDT', 'SUI-USDT', 'TURBO-USDT']; // Replace with your desired symbols

const fs = require('fs');
const path = require('path');

// Read env files from bots folder
const botCount = 3;
const delays = [0, 3000, 6000]; // Staggered start

for (let i = 0; i < botCount; i++) {
  const botDir = path.join(__dirname, 'bots', `bot${i + 1}`);
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
    const child = spawn('node', ['index.js'], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });

    child.on('exit', code => {
      console.error(`❌ Bot ${env.BOT_NAME} exited with code ${code}`);
    });
  }, delay);
}