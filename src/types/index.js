/**
 * @typedef {Object} ProgressInfo
 * @property {number} progress - Progress percentage
 * @property {number} processedBytes - Number of bytes processed
 * @property {number} speed - Processing speed in MB/s
 * @property {Object} bufferInfo - Buffer information
 * @property {number} bufferInfo.bufferSize - Current buffer size
 * @property {number} bufferInfo.bufferGrowth - Buffer growth rate
 */

/**
 * @typedef {Object} MergeOptions
 * @property {function(ProgressInfo): void} [onProgress] - Progress callback
 */

/**
 * @typedef {Object} JsonObject
 * @property {number} id - Object ID
 * @property {number} timestamp - Timestamp
 * @property {string} data - Data content
 */

module.exports = {
  ProgressInfo: 'ProgressInfo',
  MergeOptions: 'MergeOptions',
  JsonObject: 'JsonObject'
}; 