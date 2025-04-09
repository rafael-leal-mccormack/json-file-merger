import { promises as fs } from 'fs';
import { Stats } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Gets the size of a file in bytes
 * @param filePath Path to the file
 * @returns Promise that resolves to the file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats: Stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Formats bytes into a human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string with appropriate unit (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculates an optimal chunk size for file processing
 * @param totalBytes Total size of files to process
 * @returns Optimal chunk size in bytes
 */
export function calculateOptimalChunkSize(totalBytes: number): number {
  // Base chunk size of 64KB
  const baseChunkSize = 64 * 1024;
  
  // For files larger than 1GB, use larger chunks
  if (totalBytes > 1024 * 1024 * 1024) {
    return Math.min(baseChunkSize * 16, 1024 * 1024); // Max 1MB
  }
  
  return baseChunkSize;
}

/**
 * Gets all JSON files from a directory
 * @param directory Path to the directory
 * @returns Array of JSON file paths
 */
export async function getJsonFilesFromDirectory(directory: string): Promise<string[]> {
  const pattern = path.join(directory, '*.json');
  return await glob(pattern);
}

/**
 * Expands glob patterns to get matching files
 * @param patterns Array of glob patterns
 * @returns Array of matching file paths
 */
export async function expandGlobPatterns(patterns: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }
  return files;
} 