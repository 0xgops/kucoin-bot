import axios from 'axios';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

export async function sendDiscordMessage(message) {
  try {
    await axios.post(WEBHOOK_URL, { content: message });
  } catch (err) {
    console.error('❌ Discord error:', err.message);
  }
}