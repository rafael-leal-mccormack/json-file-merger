# JSON File Merger

A Node.js package for merging large JSON files using streams, designed to handle files that are too large to fit in memory. The official release of another package I created for my job that never existed in a repository.

## Features

- Stream-based processing for memory-efficient handling of large JSON files
- Supports merging multiple JSON files into a single JSON array
- No memory limitations as it processes files in chunks
- Maintains JSON formatting in the output file
- Command-line interface for easy use
- Support for merging all JSON files from a directory
- Wildcard pattern support for flexible file selection
- Progress tracking with speed metrics and buffer information
- Silent mode for automated scripts

## Installation

```bash
npm install json-file-merger
```

## Usage

### As a Node.js Module

```javascript
const { mergeJsonFiles } = require('json-file-merger');

// Example 1: Basic file merging with progress tracking
async function example() {
  try {
    await mergeJsonFiles(
      ['file1.json', 'file2.json', 'file3.json'],
      'merged-output.json',
      {
        onProgress: (progressInfo) => {
          console.log(
            `Progress: ${progressInfo.progress.toFixed(1)}% ` +
            `(${progressInfo.processedBytes} bytes processed) ` +
            `[${progressInfo.speed.toFixed(1)} MB/s]`
          );
        }
      }
    );
    console.log('Files merged successfully!');
  } catch (error) {
    console.error('Error merging files:', error);
  }
}

// Example 2: Using directory and pattern matching
const { getJsonFilesFromDirectory, expandGlobPatterns } = require('json-file-merger');

async function advancedExample() {
  try {
    // Get all JSON files from a directory
    const filesFromDir = await getJsonFilesFromDirectory('./json-files');
    
    // Combine with files matching a pattern
    const additionalFiles = await expandGlobPatterns(['additional/*.json']);
    
    // Merge all files
    await mergeJsonFiles(
      [...filesFromDir, ...additionalFiles],
      'combined-output.json'
    );
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Command Line Interface

After installation, you can use the package from the command line:

```bash
# Basic usage - merge specific files
json-file-merger output.json input1.json input2.json input3.json

# Merge files from a directory
json-file-merger output.json --dir ./json-files

# Merge files using wildcards
json-file-merger output.json "data/*.json"
json-file-merger output.json "data-*.json"

# Combine directory files with additional patterns
json-file-merger output.json --dir ./json-files "additional/*.json"

# Silent mode (suppress progress output)
json-file-merger -s output.json --dir ./json-files

# Show help
json-file-merger --help
```

## API Reference

### `mergeJsonFiles(inputFiles, outputFile, options)`

Merges multiple JSON files into a single JSON array.

#### Parameters

- `inputFiles` (string[]): Array of input file paths to merge
- `outputFile` (string): Path where the merged JSON will be written
- `options` (object): Optional configuration
  - `onProgress` (function): Callback function that receives progress information
    ```javascript
    {
      progress: number,        // Progress percentage (0-100)
      processedBytes: number,  // Number of bytes processed
      speed: number,          // Processing speed in MB/s
      bufferInfo: {           // Buffer information
        bufferSize: number    // Current buffer size
      }
    }
    ```

### `getJsonFilesFromDirectory(directory, pattern = '*.json')`

Retrieves all JSON files from a specified directory.

#### Parameters

- `directory` (string): Path to the directory containing JSON files
- `pattern` (string): Optional glob pattern for file matching (default: '*.json')

#### Returns

- Promise<string[]>: Array of file paths

### `expandGlobPatterns(patterns)`

Expands glob patterns to match JSON files.

#### Parameters

- `patterns` (string[]): Array of glob patterns

#### Returns

- Promise<string[]>: Array of matched file paths

## Testing

The package includes comprehensive tests covering:

```javascript
// Test scenarios from test-publish.js
- Merging specific files
- Merging using wildcards (e.g., "data-*.json")
- Merging all JSON files from a directory
- Combining directory files with additional files
- Command line interface operations:
  - Basic file merging
  - Directory-based merging
  - Wildcard pattern matching
  - Combined operations
  - Silent mode
```

To run the tests:

```bash
npm test
```

## Performance

The package is designed for high-performance merging of large JSON files:
- Stream-based processing with no memory limitations
- Dynamic chunk sizing based on total file size
- Memory-efficient object handling
- Progress tracking with speed metrics
- Typical processing speeds of 100+ MB/s

## License

MIT 