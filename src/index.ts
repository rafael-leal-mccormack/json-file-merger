import { createReadStream, createWriteStream } from 'fs';
import { Transform } from 'stream';
import { JsonStreamMerger } from './streams/json-stream-merger';
import { getFileSize, calculateOptimalChunkSize, formatBytes, getJsonFilesFromDirectory } from './utils/file-utils';
import { MergeOptions, ProgressInfo } from './types';

/**
 * Merges multiple JSON files into a single JSON array
 * @param inputFiles Array of input file paths
 * @param outputFile Path to the output file
 * @param options Optional configuration
 */
export async function mergeJsonFiles(
  inputFiles: string[],
  outputFile: string,
  options: MergeOptions = {}
): Promise<void> {
  if (!inputFiles.length) {
    throw new Error('No input files provided');
  }

  // Create writable stream with a large buffer
  const outputStream = createWriteStream(outputFile, {
    highWaterMark: 16 * 1024 * 1024 // 16MB buffer
  });

  // Calculate total size of all files
  let totalBytes = 0;
  for (const file of inputFiles) {
    totalBytes += await getFileSize(file);
  }

  // Create the merger stream
  const merger = new JsonStreamMerger({ onProgress: options.onProgress });
  merger.totalBytes = totalBytes;

  // Debug information
  const debugInfo = {
    firstLines: [] as string[],
    lastLines: [] as string[],
    lineCount: 0
  };

  // Create a transform stream to capture debug info
  const debugStream = new Transform({
    transform(chunk: Buffer, encoding: string, callback: (error?: Error | null, data?: Buffer) => void) {
      const lines = chunk.toString().split('\n');
      debugInfo.lineCount += lines.length;
      
      if (debugInfo.firstLines.length < 5) {
        debugInfo.firstLines.push(...lines.slice(0, 5 - debugInfo.firstLines.length));
      }
      
      debugInfo.lastLines = lines.slice(-5);
      callback(null, chunk);
    }
  });

  // Calculate optimal chunk size
  const chunkSize = calculateOptimalChunkSize(totalBytes);

  // Pipe the streams together
  merger
    .pipe(debugStream)
    .pipe(outputStream);

  // Process each input file
  for (const file of inputFiles) {
    const readStream = createReadStream(file, {
      highWaterMark: chunkSize
    });

    await new Promise<void>((resolve, reject) => {
      readStream.on('error', reject);
      readStream.pipe(merger, { end: false });
      readStream.on('end', () => resolve());
    });
  }

  // Finalize the merge
  await new Promise<void>((resolve, reject) => {
    outputStream.on('error', reject);
    outputStream.on('finish', resolve);
    merger.end();
  });

  // Log debug information
  console.log('\nDebug Information:');
  console.log('First 5 lines:', debugInfo.firstLines);
  console.log('Last 5 lines:', debugInfo.lastLines);
  console.log('Total lines:', debugInfo.lineCount);
}

// Export all utilities
export {
  getFileSize,
  calculateOptimalChunkSize,
  formatBytes,
  getJsonFilesFromDirectory
}; 