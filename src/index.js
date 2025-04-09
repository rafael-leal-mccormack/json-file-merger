const fs = require('fs');
const { Transform } = require('stream');
const { createReadStream } = require('fs');
const readline = require('readline');

class JsonStreamMerger extends Transform {
  constructor(options = {}) {
    super(options);
    this.isFirstFile = true;
    this.isFirstObject = true;
    this.buffer = '';
    this.processedBytes = 0;
    this.totalBytes = 0;
    this.onProgress = options.onProgress || (() => {});
    this.arrayStartWritten = false;
    this.isInterrupted = false;
  }

  _transform(chunk, encoding, callback) {
    try {
      this.processedBytes += chunk.length;
      this.buffer += chunk;
      const lines = this.buffer.split('\n');
      
      // Keep the last line in the buffer as it might be incomplete
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        try {
          const data = JSON.parse(trimmedLine);
          
          // Write array start only once at the beginning
          if (!this.arrayStartWritten) {
            this.push('[\n');
            this.arrayStartWritten = true;
          }

          // Write comma and newline before each object (except the first)
          if (!this.isFirstObject) {
            this.push(',\n');
          }
          this.isFirstObject = false;

          // Write the object
          this.push(JSON.stringify(data));
        } catch (e) {
          // If we can't parse the line, it might be part of a larger JSON object
          // We'll handle it in the next chunk
          this.buffer = trimmedLine + '\n' + this.buffer;
        }
      }
      
      // Report progress
      if (this.totalBytes > 0) {
        const progress = (this.processedBytes / this.totalBytes) * 100;
        this.onProgress(progress, this.processedBytes);
      }
      
      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      // Process any remaining data in the buffer
      if (this.buffer) {
        try {
          const data = JSON.parse(this.buffer);
          if (!this.isFirstObject) {
            this.push(',\n');
          }
          this.isFirstObject = false;
          this.push(JSON.stringify(data));
        } catch (e) {
          // If we can't parse the remaining buffer, it's invalid JSON
          callback(new Error('Invalid JSON in the last chunk'));
          return;
        }
      }

      // Write array end only if not interrupted
      if (this.arrayStartWritten && !this.isInterrupted) {
        this.push('\n]');
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

  const writeStream = fs.createWriteStream(outputFile);
  const merger = new JsonStreamMerger({ onProgress: options.onProgress });

  merger.pipe(writeStream);

  let totalProcessedBytes = 0;
  let totalBytes = 0;

  // Calculate total size of all files
  for (const file of inputFiles) {
    totalBytes += await getFileSize(file);
  }

  for (const file of inputFiles) {
    const fileSize = await getFileSize(file);
    merger.totalBytes = fileSize;
    merger.processedBytes = 0;

    await new Promise((resolve, reject) => {
      const readStream = createReadStream(file, { 
        encoding: 'utf8',
        highWaterMark: 1024 * 1024 // 1MB chunks
      });
      
      readStream.on('error', reject);
      readStream.on('end', () => {
        totalProcessedBytes += fileSize;
        if (options.onProgress) {
          const overallProgress = (totalProcessedBytes / totalBytes) * 100;
          options.onProgress(overallProgress, totalProcessedBytes);
        }
        resolve();
      });
      
      readStream.pipe(merger, { end: false });
    });
  }

  merger.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

module.exports = {
  mergeJsonFiles,
  JsonStreamMerger,
  formatBytes
}; 