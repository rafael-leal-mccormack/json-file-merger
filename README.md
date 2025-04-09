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

## Installation

```bash
npm install json-file-merger
```

## Usage

### As a Node.js Module

```javascript
const { mergeJsonFiles } = require('json-file-merger');

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
json-file-merger output.json input1.json input2.json input3.json

# Merge files using wildcards
json-file-merger output.json "data/*.json"
json-file-merger output.json "**/*.json"  # Recursive search
json-file-merger output.json "data-*.json" # Pattern matching

# Merge all JSON files from a directory
json-file-merger output.json --directory ./json-files

# Combine directory and specific files with wildcards
json-file-merger output.json --directory ./json-files "additional/*.json"

# Suppress console output
json-file-merger -s output.json --directory ./json-files

# Show help
json-file-merger --help
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

## Testing

To run the tests, clone the repository and run:

```bash
node test/test.js
```

The test suite will:
- Generate test files of various sizes (including a 2GB file)
- Test file merging with different file sizes
- Verify the output file structure and content
- Test interruption handling

You can also run tests with cleanup of previous test files:

```bash
node test/test.js --cleanup
```

This will remove any existing test files before running the tests.

## License

MIT 