import fs from 'fs';
import path from 'path';

// Full path to tradeResults log
const LOG_PATH = path.resolve('./logs/tradeResults.json');

// 🔁 Load existing results (or empty array)
function loadResults() {
  if (!fs.existsSync(LOG_PATH)) return [];
  try {
    const data = fs.readFileSync(LOG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.warn(`⚠️ Failed to load results: ${err.message}`);
    return [];
  }
}

// ✅ Append a new result
function logResult(entry) {
  const results = loadResults();
  results.push(entry);

  try {
    fs.writeFileSync(LOG_PATH, JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(`❌ Failed to write result log: ${err.message}`);
  }
}

export { logResult };