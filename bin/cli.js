#!/usr/bin/env node

const { mergeJsonFiles, formatBytes } = require('../src/index');
const { getJsonFilesFromDirectory, expandGlobPatterns } = require('../src/utils');
const path = require('path');

const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
let lastProgress = 0;
let startTime = null;
let totalBytes = 0;

function updateSpinner(progress, processedBytes, speed) {
  if (!startTime) {
    startTime = Date.now();
  }

  // Only update if progress has changed by at least 0.1%
  if (Math.floor(progress * 10) > Math.floor(lastProgress * 10)) {
    lastProgress = progress;
    spinnerIndex = (spinnerIndex + 1) % spinners.length;
    const elapsed = (Date.now() - startTime) / 1000;
    
    process.stdout.write(
      `\r${spinners[spinnerIndex]} Processing: ${progress.toFixed(1)}% ` +
      `(${formatBytes(processedBytes)} / ${formatBytes(totalBytes)}) ` +
      `[${speed.toFixed(1)} MB/s]`
    );
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('Usage: json-stream-merger <output-file> <input-file1> [input-file2 ...]');
      console.error('       json-stream-merger <output-file> --dir <directory>');
      console.error('       json-stream-merger <output-file> --dir <directory> --pattern "*.json"');
      console.error('\nExamples:');
      console.error('  json-stream-merger output.json file1.json file2.json');
      console.error('  json-stream-merger output.json --dir ./data');
      console.error('  json-stream-merger output.json --dir ./data --pattern "*.json"');
      console.error('  json-stream-merger output.json "data/*.json"');
      console.error('  json-stream-merger output.json "**/*.json"');
      process.exit(1);
    }

    const outputFile = args[0];
    let inputFiles = [];

    if (args.includes('--dir')) {
      const dirIndex = args.indexOf('--dir');
      const dir = args[dirIndex + 1];
      const pattern = args.includes('--pattern') ? args[args.indexOf('--pattern') + 1] : '*.json';
      inputFiles = await getJsonFilesFromDirectory(dir, pattern);
    } else {
      // Handle wildcard patterns in input files
      inputFiles = await expandGlobPatterns(args.slice(1));
    }

    if (inputFiles.length === 0) {
      console.error('No JSON files found to merge');
      process.exit(1);
    }

    // Calculate total size
    const fs = require('fs');
    for (const file of inputFiles) {
      const stats = fs.statSync(file);
      totalBytes += stats.size;
    }

    console.log(`Found ${inputFiles.length} files to merge (${formatBytes(totalBytes)} total)`);
    console.log('Starting merge process...\n');

    await mergeJsonFiles(inputFiles, outputFile, {
      onProgress: updateSpinner
    });

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n\nMerge completed successfully!`);
    console.log(`Total time: ${totalTime.toFixed(1)}s`);
    console.log(`Average speed: ${(totalBytes / totalTime / 1024 / 1024).toFixed(1)} MB/s`);
    console.log(`Output written to: ${outputFile}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 