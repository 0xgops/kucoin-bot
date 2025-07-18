// config/discord.js
import 'dotenv/config';
import axios from 'axios';

const webhookURL = process.env.DISCORD_WEBHOOK;

export async function sendDiscordMessage(message) {
  if (!webhookURL) return;

  try {
    await axios.post(webhookURL, {
      content: message,
    });
  } catch (err) {
    console.error('❌ Failed to send Discord message:', err.message);
  }
}