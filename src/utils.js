const { glob } = require('glob');
const path = require('path');

/**
 * Gets all JSON files from a directory
 * @param {string} directory - Directory to search in
 * @param {string} pattern - Glob pattern to match files
 * @returns {Promise<string[]>} Array of file paths
 */
async function getJsonFilesFromDirectory(directory, pattern = '*.json') {
  const files = await glob(pattern, { cwd: directory });
  return files.map(file => path.join(directory, file));
}

/**
 * Expands glob patterns to get matching files
 * @param {string[]} patterns - Array of glob patterns
 * @returns {Promise<string[]>} Array of matching file paths
 */
async function expandGlobPatterns(patterns) {
  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }
  return files;
}

module.exports = {
  getJsonFilesFromDirectory,
  expandGlobPatterns
}; 