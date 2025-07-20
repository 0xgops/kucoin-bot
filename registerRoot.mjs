import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import moduleAlias from 'module-alias';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
require('module-alias/register');

// ✅ Define aliases
moduleAlias.addAliases({
  '@services': path.resolve(__dirname, 'services'),
  '@utils': path.resolve(__dirname, 'utils'),
  '@config': path.resolve(__dirname, 'config'),
  '@logic': path.resolve(__dirname, 'logic'),
});