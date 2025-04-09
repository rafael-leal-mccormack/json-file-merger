import { Transform } from 'stream';
import { ProgressInfo } from '../types';

/**
 * A Transform stream that merges multiple JSON files into a single JSON array
 */
export class JsonStreamMerger extends Transform {
  private isFirstFile: boolean = true;
  private processedBytes: number = 0;
  public totalBytes: number = 0;
  private startTime: number;
  private onProgress: (info: ProgressInfo) => void;
  private arrayStartWritten: boolean = false;
  private isInterrupted: boolean = false;
  private lastChar: string = '';
  private buffer: string = '';

  constructor(options: { onProgress?: (info: ProgressInfo) => void } = {}) {
    super();
    this.startTime = Date.now();
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Process a chunk of data
   */
  _transform(chunk: Buffer, encoding: string, callback: (error?: Error | null) => void): void {
    try {
      this.processedBytes += chunk.length;
      this._writeArrayStart();
      this._processChunk(chunk.toString());
      this._reportProgress();
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Write the opening array bracket if not already written
   */
  private _writeArrayStart(): void {
    if (!this.arrayStartWritten) {
      this.push('[\n');
      this.arrayStartWritten = true;
    }
  }

  /**
   * Process a chunk of text data
   */
  private _processChunk(chunkStr: string): void {
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
   */
  private _shouldSkipLine(line: string): boolean {
    return line === '[' || line === ']';
  }

  /**
   * Write a line with proper formatting
   */
  private _writeLine(line: string): void {
    if (this.lastChar === '}' && line.startsWith('{')) {
      this.push(',\n');
    }
    this.push(line + '\n');
    this.lastChar = line[line.length - 1];
  }

  /**
   * Report progress information
   */
  private _reportProgress(): void {
    if (this.totalBytes > 0) {
      const progress = (this.processedBytes / this.totalBytes) * 100;
      const elapsed = (Date.now() - this.startTime) / 1000;
      const speed = this.processedBytes / elapsed / 1024 / 1024;

      const progressInfo: ProgressInfo = {
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
   */
  _flush(callback: (error?: Error | null) => void): void {
    try {
      if (this.buffer) {
        this._processChunk('');
      }
      if (this.arrayStartWritten && !this.isInterrupted) {
        this.push(']');
      }
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Handle stream destruction
   */
  _destroy(err: Error | null, callback: (error: Error | null) => void): void {
    this.isInterrupted = true;
    callback(err);
  }
} 