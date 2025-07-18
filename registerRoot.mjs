// registerRoot.js
import path from 'path';
import { fileURLToPath } from 'url';
import moduleAlias from 'module-alias';

// ⛓️ Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧠 Register aliases
moduleAlias.addAliases({
  '@root': __dirname,
  '@services': path.join(__dirname, 'services'),
  '@utils': path.join(__dirname, 'utils'),
  '@logic': path.join(__dirname, 'logic'),
  '@config': path.join(__dirname, 'config')
});