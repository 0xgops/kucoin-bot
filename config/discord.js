const axios = require('axios');
require('dotenv').config();

const webhookURL = process.env.DISCORD_WEBHOOK;

async function sendDiscordMessage(message) {
  if (!webhookURL) return;

  try {
    await axios.post(webhookURL, {
      content: message,
    });
  } catch (err) {
    console.error('Failed to send Discord message:', err.message);
  }
}

module.exports = { sendDiscordMessage };