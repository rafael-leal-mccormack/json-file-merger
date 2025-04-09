const fs = require('fs');
const { promisify } = require('util');

const stat = promisify(fs.stat);

/**
 * Get the size of a file in bytes
 * @param {string} filePath - Path to the file
 * @returns {Promise<number>} File size in bytes
 */
async function getFileSize(filePath) {
  const stats = await stat(filePath);
  return stats.size;
}

/**
 * Format bytes into a human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate optimal chunk size based on total file size
 * @param {number} totalBytes - Total size of all files
 * @returns {number} Optimal chunk size in bytes
 */
function calculateOptimalChunkSize(totalBytes) {
  return Math.min(
    Math.max(64 * 1024, Math.floor(totalBytes / 1000)), // At least 64KB, at most total/1000
    1024 * 1024 // Cap at 1MB
  );
}

module.exports = {
  getFileSize,
  formatBytes,
  calculateOptimalChunkSize
}; 