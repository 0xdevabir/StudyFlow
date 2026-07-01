/* eslint-env node */
module.exports = {
  root: true,
  extends: ['./packages/config/eslint/index.cjs'],
  ignorePatterns: ['dist', '.next', '.turbo', 'node_modules'],
};