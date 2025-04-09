const fs = require('fs');
const { Transform } = require('stream');
const { createReadStream } = require('fs');
const readline = require('readline');

class JsonStreamMerger extends Transform {
  constructor(options = {}) {
    super(options);
    this.isFirstFile = true;
    this.processedBytes = 0;
    this.totalBytes = 0;
    this.startTime = Date.now();
    this.onProgress = options.onProgress || (() => {});
    this.arrayStartWritten = false;
    this.isInterrupted = false;
    this.lastChar = '';
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    try {
      this.processedBytes += chunk.length;
      
      // Write array start only once at the beginning
      if (!this.arrayStartWritten) {
        this.push('[\n');
        this.arrayStartWritten = true;
      }

      // Convert chunk to string and process it
      const chunkStr = this.buffer + chunk.toString();
      this.buffer = '';

      // Process the chunk line by line
      const lines = chunkStr.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip array brackets
        if (line === '[' || line === ']') continue;

        // Add comma if needed
        if (this.lastChar === '}' && line.startsWith('{')) {
          this.push(',\n');
        }

        // Write the line
        this.push(line + '\n');
        this.lastChar = line[line.length - 1];
      }
      
      // Report progress with speed
      if (this.totalBytes > 0) {
        const progress = (this.processedBytes / this.totalBytes) * 100;
        const elapsed = (Date.now() - this.startTime) / 1000; // seconds
        const speed = this.processedBytes / elapsed / 1024 / 1024; // MB/s
        this.onProgress(progress, this.processedBytes, speed, {
          bufferSize: this.buffer.length,
          bufferGrowth: 0
        });
      }
      
      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      // Process any remaining buffer
      if (this.buffer) {
        const lines = this.buffer.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line === '[' || line === ']') continue;

          if (this.lastChar === '}' && line.startsWith('{')) {
            this.push(',\n');
          }

          this.push(line + '\n');
          this.lastChar = line[line.length - 1];
        }
      }

      // Write array end only if not interrupted
      if (this.arrayStartWritten && !this.isInterrupted) {
        this.push(']');
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }

  // Handle interruption
  _destroy(err, callback) {
    this.isInterrupted = true;
    // Don't write the closing bracket if interrupted
    callback(err);
  }
}

/**
 * Gets the total size of a file in bytes
 * @param {string} filePath - Path to the file
 * @returns {Promise<number>} - Total size of the file in bytes
 */
async function getFileSize(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) reject(err);
      else resolve(stats.size);
    });
  });
}

/**
 * Formats bytes into human readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

/**
 * Merges multiple JSON files into a single JSON array using streams
 * @param {string[]} inputFiles - Array of input file paths to merge
 * @param {string} outputFile - Output file path
 * @param {Object} options - Additional options
 * @param {Function} options.onProgress - Callback function to report progress
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
    onProgress: (progress, processedBytes, speed, bufferInfo) => {
      if (options.onProgress) {
        options.onProgress(progress, processedBytes, speed, bufferInfo);
      }
    }
  });

  // Create a buffer to store the first and last lines
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

  // Calculate optimal chunk size based on total file size
  const optimalChunkSize = Math.min(
    Math.max(64 * 1024, Math.floor(totalBytes / 1000)), // At least 64KB, at most total/1000
    1024 * 1024 // Cap at 1MB
  );

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
        merger.isFirstFile = false; // Mark that we've processed at least one file
        if (options.onProgress) {
          const overallProgress = (totalProcessedBytes / totalBytes) * 100;
          const elapsed = (Date.now() - merger.startTime) / 1000;
          const speed = totalProcessedBytes / elapsed / 1024 / 1024;
          options.onProgress(overallProgress, totalProcessedBytes, speed, {
            bufferSize: merger.buffer.length,
            bufferGrowth: 0
          });
        }
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