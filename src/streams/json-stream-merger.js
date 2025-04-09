const { Transform } = require('stream');
const { ProgressInfo } = require('../types');

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

  /**
   * Process a chunk of data
   * @param {Buffer} chunk - Data chunk
   * @param {string} encoding - Encoding type
   * @param {function} callback - Completion callback
   */
  _transform(chunk, encoding, callback) {
    try {
      this.processedBytes += chunk.length;
      this._writeArrayStart();
      this._processChunk(chunk.toString());
      this._reportProgress();
      callback();
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Write the opening array bracket if not already written
   */
  _writeArrayStart() {
    if (!this.arrayStartWritten) {
      this.push('[\n');
      this.arrayStartWritten = true;
    }
  }

  /**
   * Process a chunk of text data
   * @param {string} chunkStr - String chunk to process
   */
  _processChunk(chunkStr) {
    const fullChunk = this.buffer + chunkStr;
    this.buffer = '';

    const lines = fullChunk.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (this._shouldSkipLine(trimmedLine)) continue;
      this._writeLine(trimmedLine);
    }
  }

  /**
   * Check if a line should be skipped
   * @param {string} line - Line to check
   * @returns {boolean} Whether to skip the line
   */
  _shouldSkipLine(line) {
    return line === '[' || line === ']';
  }

  /**
   * Write a line with proper formatting
   * @param {string} line - Line to write
   */
  _writeLine(line) {
    if (this.lastChar === '}' && line.startsWith('{')) {
      this.push(',\n');
    }
    this.push(line + '\n');
    this.lastChar = line[line.length - 1];
  }

  /**
   * Report progress information
   */
  _reportProgress() {
    if (this.totalBytes > 0) {
      const progress = (this.processedBytes / this.totalBytes) * 100;
      const elapsed = (Date.now() - this.startTime) / 1000;
      const speed = this.processedBytes / elapsed / 1024 / 1024;

      /** @type {ProgressInfo} */
      const progressInfo = {
        progress,
        processedBytes: this.processedBytes,
        speed,
        bufferInfo: {
          bufferSize: this.buffer.length,
          bufferGrowth: 0
        }
      };

      this.onProgress(progressInfo);
    }
  }

  /**
   * Flush any remaining data
   * @param {function} callback - Completion callback
   */
  _flush(callback) {
    try {
      if (this.buffer) {
        this._processChunk('');
      }
      if (this.arrayStartWritten && !this.isInterrupted) {
        this.push(']');
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Handle stream destruction
   * @param {Error} err - Error that caused destruction
   * @param {function} callback - Completion callback
   */
  _destroy(err, callback) {
    this.isInterrupted = true;
    callback(err);
  }
}

module.exports = JsonStreamMerger; 