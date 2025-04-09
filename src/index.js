const fs = require('fs');
const { createReadStream } = require('fs');
const { Transform } = require('stream');
const JsonStreamMerger = require('./streams/json-stream-merger');
const { getFileSize, formatBytes, calculateOptimalChunkSize } = require('./utils/file-utils');
const { MergeOptions } = require('./types');

/**
 * Merge multiple JSON files into a single JSON array
 * @param {string[]} inputFiles - Array of input file paths
 * @param {string} outputFile - Output file path
 * @param {MergeOptions} options - Merge options
 * @returns {Promise<void>}
 */
async function mergeJsonFiles(inputFiles, outputFile, options = {}) {
  if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
    throw new Error('Input files array must contain at least one file');
  }

  const writeStream = fs.createWriteStream(outputFile, {
    highWaterMark: 16 * 1024 * 1024 // 16MB write buffer
  });

  const merger = new JsonStreamMerger({ 
    onProgress: (progressInfo) => {
      if (options.onProgress) {
        options.onProgress(progressInfo);
      }
    }
  });

  // Create a buffer to store the first and last lines for debugging
  const debugBuffer = {
    firstLines: [],
    lastLines: []
  };

  // Create a transform stream to capture lines for debugging
  const debugStream = new Transform({
    transform(chunk, encoding, callback) {
      const lines = chunk.toString().split('\n');
      
      // Store first 5 lines
      for (const line of lines) {
        if (debugBuffer.firstLines.length < 5) {
          debugBuffer.firstLines.push(line);
        } else {
          break;
        }
      }

      // Store last 5 lines
      debugBuffer.lastLines = debugBuffer.lastLines.concat(lines).slice(-5);
      
      this.push(chunk);
      callback();
    }
  });

  merger.pipe(debugStream).pipe(writeStream);

  let totalProcessedBytes = 0;
  let totalBytes = 0;

  // Calculate total size of all files
  for (const file of inputFiles) {
    totalBytes += await getFileSize(file);
  }

  const optimalChunkSize = calculateOptimalChunkSize(totalBytes);

  for (const file of inputFiles) {
    const fileSize = await getFileSize(file);
    merger.totalBytes = totalBytes;
    merger.processedBytes = totalProcessedBytes;

    await new Promise((resolve, reject) => {
      const readStream = createReadStream(file, { 
        encoding: 'utf8',
        highWaterMark: optimalChunkSize
      });
      
      readStream.on('error', reject);
      readStream.on('end', () => {
        totalProcessedBytes += fileSize;
        merger.isFirstFile = false;
        resolve();
      });
      
      readStream.pipe(merger, { end: false });
    });
  }

  merger.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      // Print debugging information
      console.log('\nDebugging Output:');
      console.log('First 5 lines:');
      debugBuffer.firstLines.forEach((line, i) => console.log(`${i + 1}: ${line}`));
      console.log('\nLast 5 lines:');
      debugBuffer.lastLines.forEach((line, i) => console.log(`${i + 1}: ${line}`));
      resolve();
    });
    writeStream.on('error', reject);
  });
}

module.exports = {
  mergeJsonFiles,
  JsonStreamMerger,
  formatBytes
}; 