const fs = require('fs');
const path = require('path');
const { mergeJsonFiles, formatBytes } = require('../src/index');
const { getJsonFilesFromDirectory } = require('../src/utils');
const generateTestData = require('./generate-test-data');
const generateTestData2 = require('./generate-test-data-2');
const generateTestData3 = require('./generate-test-data-3');
const testInterruption = require('./test-interruption');

async function verifyOutputFile(filePath) {
  return new Promise((resolve, reject) => {
    // Get file size
    const stats = fs.statSync(filePath);
    console.log(`\nOutput file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Read the first chunk to get the first object
    const firstChunkStream = fs.createReadStream(filePath, {
      start: 0,
      end: 2000, // Increased size to ensure we get a complete object
      encoding: 'utf8'
    });

    let firstChunkStr = '';
    firstChunkStream.on('data', chunk => {
      firstChunkStr += chunk;
    });

    firstChunkStream.on('end', () => {
      try {
        // Find the position of the first complete object
        let depth = 0;
        let start = firstChunkStr.indexOf('[') + 1;
        let pos = start;
        
        // Skip whitespace
        while (pos < firstChunkStr.length && /\s/.test(firstChunkStr[pos])) pos++;
        
        // Parse until we find a complete object
        while (pos < firstChunkStr.length) {
          const char = firstChunkStr[pos];
          if (char === '{') depth++;
          else if (char === '}') {
            depth--;
            if (depth === 0) break;
          }
          pos++;
        }
        
        // Extract and parse the first object
        const firstObjectStr = firstChunkStr.substring(start, pos + 1);
        const firstObject = JSON.parse(firstObjectStr);

        // Now read the last chunk to get the last object
        const lastChunkSize = 200 * 1024; // Increased to 200KB
        const lastChunkStart = Math.max(0, stats.size - lastChunkSize);
        const lastChunkStream = fs.createReadStream(filePath, {
          start: lastChunkStart,
          end: stats.size,
          encoding: 'utf8'
        });

        let lastChunkStr = '';
        lastChunkStream.on('data', chunk => {
          lastChunkStr += chunk;
        });

        lastChunkStream.on('end', () => {
          try {
            // Find the position of the last complete object
            let depth = 0;
            let end = lastChunkStr.lastIndexOf(']');
            let pos = end - 1;
            
            // Skip whitespace
            while (pos >= 0 && /\s/.test(lastChunkStr[pos])) pos--;
            
            // Parse backwards until we find a complete object
            let start = pos;
            while (start >= 0) {
              const char = lastChunkStr[start];
              if (char === '}') depth++;
              else if (char === '{') {
                depth--;
                if (depth === 0) break;
              }
              start--;
            }
            
            // Extract and parse the last object
            const lastObjectStr = lastChunkStr.substring(start, pos + 1);
            const lastObject = JSON.parse(lastObjectStr);

            // Count objects in the last chunk (rough estimate)
            const objectCount = (lastChunkStr.match(/\{/g) || []).length;

            resolve({ count: objectCount, firstObject, lastObject });
          } catch (err) {
            reject(new Error('Failed to parse last object: ' + err.message));
          }
        });

        lastChunkStream.on('error', reject);
      } catch (err) {
        reject(new Error('Failed to parse first object: ' + err.message));
      }
    });

    firstChunkStream.on('error', reject);
  });
}

async function checkTestFile(filePath, minSize = 1024 * 1024) { // minSize = 1MB
  try {
    const stats = fs.statSync(filePath);
    return stats.size >= minSize; // File exists and has minimum size
  } catch (err) {
    return false; // File doesn't exist or can't be accessed
  }
}

async function cleanupTestFiles() {
  const testDir = path.join(__dirname, 'data');
  if (fs.existsSync(testDir)) {
    const files = await getJsonFilesFromDirectory(testDir);
    for (const file of files) {
      try {
        fs.unlinkSync(file);
        console.log(`Cleaned up: ${path.basename(file)}`);
      } catch (err) {
        console.warn(`Warning: Could not delete ${file}:`, err.message);
      }
    }
  }
}

async function waitForFile(filePath, timeout = 120000) {
  const startTime = Date.now();
  let lastSize = 0;
  let lastCheckTime = startTime;

  while (Date.now() - startTime < timeout) {
    try {
      const stats = fs.statSync(filePath);
      const currentSize = stats.size;
      const currentTime = Date.now();
      const timeSinceLastCheck = currentTime - lastCheckTime;

      // If file size hasn't changed at all, it's done being written
      if (currentSize === lastSize && currentSize > 0) {
        return true;
      }

      // If file size decreased, something went wrong
      if (currentSize < lastSize) {
        throw new Error('File size decreased unexpectedly');
      }

      lastSize = currentSize;
      lastCheckTime = currentTime;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      // File doesn't exist yet, wait and try again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function runTests(options = { cleanup: false }) {
  console.log('Starting tests...\n');

  // Cleanup if requested
  if (options.cleanup) {
    console.log('Cleaning up previous test files...');
    await cleanupTestFiles();
  }

  // Create test directory if it doesn't exist
  const testDir = path.join(__dirname, 'data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Define test files
  const testFiles = {
    'large-test.json': generateTestData,
    'large-test-2.json': generateTestData2,
    'huge-test.json': generateTestData3
  };

  // Generate only missing test files
  console.log('Checking test files...');
  for (const [fileName, generator] of Object.entries(testFiles)) {
    const filePath = path.join(testDir, fileName);
    if (await checkTestFile(filePath)) {
      console.log(`${fileName} already exists, skipping generation...`);
    } else {
      console.log(`Generating ${fileName}...`);
      await generator();
      
      // Wait for file to be fully written and stable
      console.log(`Waiting for ${fileName} to be ready...`);
      if (!await waitForFile(filePath)) {
        throw new Error(`Timeout waiting for ${fileName} to be generated`);
      }
      console.log(`${fileName} is ready!`);
    }
  }

  // Get all test files
  const inputFiles = await getJsonFilesFromDirectory(testDir);
  if (inputFiles.length === 0) {
    throw new Error('No test files found after generation');
  }
  console.log(`\nFound ${inputFiles.length} test files to merge`);

  // Merge the files
  const outputFile = path.join(testDir, 'merged-output.json');
  console.log('\nMerging files...');
  await mergeJsonFiles(inputFiles, outputFile, {
    onProgress: (progress, processedBytes, speed) => {
      process.stdout.write(
        `\rProgress: ${progress.toFixed(1)}% ` +
        `(${formatBytes(processedBytes)} processed) ` +
        `[${speed.toFixed(1)} MB/s]`
      );
    }
  });

  // Verify the output
  console.log('\n\nVerifying output...');
  const stats = await verifyOutputFile(outputFile);
  
  // Basic verification
  console.log(`\nOutput file contains approximately ${stats.count} objects`);
  console.log('First object:', JSON.stringify(stats.firstObject, null, 2));
  console.log('Last object:', JSON.stringify(stats.lastObject, null, 2));

  // Test interruption handling
  console.log('\nTesting interruption handling...');
  await testInterruption();

  console.log('\nAll tests completed successfully!');
}

// Add command line argument support
const args = process.argv.slice(2);
const options = {
  cleanup: args.includes('--cleanup')
};

runTests(options).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 