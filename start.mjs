import { spawn } from 'child_process';
import './health.mjs'; // 👈 ensure health server starts

console.log('🚀 Starting KuCoin bot rotation on Render...');

const proc = spawn('node', ['rotateVolatileCoins.mjs'], {
  stdio: 'inherit',
  env: process.env,
});

proc.on('close', (code) => {
  console.log(`⛔ Bot process exited with code ${code}`);
});