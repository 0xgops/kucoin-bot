// registerRoot.js
const path = require('path');
require('module-alias/register');

require('module-alias').addAliases({
  '@root': __dirname,
  '@services': path.join(__dirname, 'services'),
  '@utils': path.join(__dirname, 'utils'),
  '@logic': path.join(__dirname, 'logic'),
  '@config': path.join(__dirname, 'config')
});