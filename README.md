# JSON Stream Merger

A Node.js package for merging large JSON files using streams, designed to handle files that are too large to fit in memory.

## Features

- Stream-based processing for memory-efficient handling of large JSON files
- Supports merging multiple JSON files into a single JSON array
- No memory limitations as it processes files in chunks
- Maintains JSON formatting in the output file
- Command-line interface for easy use
- Support for merging all JSON files from a directory
- Wildcard pattern support for flexible file selection

## Installation

```bash
npm install json-stream-merger
```

## Usage

### As a Node.js Module

```javascript
const { mergeJsonFiles } = require('json-stream-merger');

// Example usage
async function example() {
  try {
    await mergeJsonFiles(
      ['file1.json', 'file2.json', 'file3.json'],
      'merged-output.json'
    );
    console.log('Files merged successfully!');
  } catch (error) {
    console.error('Error merging files:', error);
  }
}
```

### Command Line Interface

After installation, you can use the package from the command line:

```bash
# Merge specific files
json-stream-merger output.json input1.json input2.json input3.json

# Merge files using wildcards
json-stream-merger output.json "data/*.json"
json-stream-merger output.json "**/*.json"  # Recursive search
json-stream-merger output.json "data-*.json" # Pattern matching

# Merge all JSON files from a directory
json-stream-merger output.json --directory ./json-files

# Combine directory and specific files with wildcards
json-stream-merger output.json --directory ./json-files "additional/*.json"

# Suppress console output
json-stream-merger -s output.json --directory ./json-files

# Show help
json-stream-merger --help
```

## Features

### Directory Support
The `--directory` option allows you to merge all JSON files from a specified directory. This is useful when you have multiple JSON files that need to be combined. The output file will be written to the current working directory, and if it's in the same directory as the input files, it will be automatically excluded from the merge process.

### Wildcard Support
The package supports glob patterns for flexible file selection. You can use patterns like:
- `*.json` - Match all JSON files in the current directory
- `**/*.json` - Match all JSON files in the current directory and subdirectories
- `data-*.json` - Match all JSON files starting with "data-"
- `data/*.json` - Match all JSON files in the data directory

## API

### `mergeJsonFiles(inputFiles, outputFile)`

Merges multiple JSON files into a single JSON array.

#### Parameters

- `inputFiles` (string[]): Array of input file paths to merge
- `outputFile` (string): Path where the merged JSON will be written

#### Returns

- Promise<void>: Resolves when all files are merged

#### Throws

- Error: If input files array is empty or invalid

## License

MIT 