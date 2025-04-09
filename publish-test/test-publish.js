const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { mergeJsonFiles, formatBytes, getJsonFilesFromDirectory, expandGlobPatterns } = require('json-file-merger');

async function main() {
  console.log('Testing published package...\n');

  // Create test directories
  const testDir = path.join(__dirname, 'test-data');
  const jsonDir = path.join(testDir, 'json-files');
  const additionalDir = path.join(testDir, 'additional');
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(jsonDir, { recursive: true });
    fs.mkdirSync(additionalDir, { recursive: true });
  }

  // Create test files
  console.log('Creating test files...');
  const createTestFile = (dir, name, size = 1024) => {
    const filePath = path.join(dir, name);
    const data = Array(size).fill({ id: 1, data: 'test' });
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`Created ${filePath}`);
  };

  // Create test files in json-files directory
  createTestFile(jsonDir, 'file1.json');
  createTestFile(jsonDir, 'file2.json');
  createTestFile(jsonDir, 'file3.json');
  createTestFile(jsonDir, 'data-1.json');
  createTestFile(jsonDir, 'data-2.json');

  // Create test files in additional directory
  createTestFile(additionalDir, 'extra1.json');
  createTestFile(additionalDir, 'extra2.json');

  // Test 1: Merge specific files
  console.log('\nTest 1: Merge specific files');
  const output1 = path.join(testDir, 'merged-1.json');
  await mergeJsonFiles(
    [
      path.join(jsonDir, 'file1.json'),
      path.join(jsonDir, 'file2.json'),
      path.join(jsonDir, 'file3.json')
    ],
    output1,
    {
      onProgress: (progressInfo) => {
        process.stdout.write(
          `\rProgress: ${progressInfo.progress.toFixed(1)}% ` +
          `(${formatBytes(progressInfo.processedBytes)} processed) ` +
          `[${progressInfo.speed.toFixed(1)} MB/s] ` +
          `[Buffer: ${formatBytes(progressInfo.bufferInfo.bufferSize)}]`
        );
      }
    }
  );
  console.log('\n✓ Merged specific files successfully');

  // Test 2: Merge using wildcards
  console.log('\nTest 2: Merge using wildcards');
  const output2 = path.join(testDir, 'merged-2.json');
  const files = await expandGlobPatterns([path.join(jsonDir, 'data-*.json')]);
  await mergeJsonFiles(files, output2, {
    onProgress: (progressInfo) => {
      process.stdout.write(
        `\rProgress: ${progressInfo.progress.toFixed(1)}% ` +
        `(${formatBytes(progressInfo.processedBytes)} processed) ` +
        `[${progressInfo.speed.toFixed(1)} MB/s] ` +
        `[Buffer: ${formatBytes(progressInfo.bufferInfo.bufferSize)}]`
      );
    }
  });
  console.log('\n✓ Merged files using wildcards successfully');

  // Test 3: Merge all JSON files from a directory
  console.log('\nTest 3: Merge all JSON files from a directory');
  const output3 = path.join(testDir, 'merged-3.json');
  const jsonFiles = await getJsonFilesFromDirectory(jsonDir);
  await mergeJsonFiles(jsonFiles, output3, {
    onProgress: (progressInfo) => {
      process.stdout.write(
        `\rProgress: ${progressInfo.progress.toFixed(1)}% ` +
        `(${formatBytes(progressInfo.processedBytes)} processed) ` +
        `[${progressInfo.speed.toFixed(1)} MB/s] ` +
        `[Buffer: ${formatBytes(progressInfo.bufferInfo.bufferSize)}]`
      );
    }
  });
  console.log('\n✓ Merged all files from directory successfully');

  // Test 4: Combine directory and specific files
  console.log('\nTest 4: Combine directory and specific files');
  const output4 = path.join(testDir, 'merged-4.json');
  const allFiles = [
    ...jsonFiles,
    ...(await expandGlobPatterns([path.join(additionalDir, '*.json')]))
  ];
  await mergeJsonFiles(allFiles, output4, {
    onProgress: (progressInfo) => {
      process.stdout.write(
        `\rProgress: ${progressInfo.progress.toFixed(1)}% ` +
        `(${formatBytes(progressInfo.processedBytes)} processed) ` +
        `[${progressInfo.speed.toFixed(1)} MB/s] ` +
        `[Buffer: ${formatBytes(progressInfo.bufferInfo.bufferSize)}]`
      );
    }
  });
  console.log('\n✓ Combined directory and specific files successfully');

  // Test 5: Command line interface
  console.log('\nTest 5: Command line interface');
  try {
    // Test basic command
    execSync(`npx json-file-merger ${path.join(testDir, 'cli-1.json')} ${path.join(jsonDir, 'file1.json')} ${path.join(jsonDir, 'file2.json')}`);
    console.log('✓ Basic CLI command successful');

    // Test directory command
    execSync(`npx json-file-merger ${path.join(testDir, 'cli-2.json')} --directory ${jsonDir}`);
    console.log('✓ Directory CLI command successful');

    // Test wildcard command
    execSync(`npx json-file-merger ${path.join(testDir, 'cli-3.json')} "${path.join(jsonDir, 'data-*.json')}"`);
    console.log('✓ Wildcard CLI command successful');

    // Test combined command
    execSync(`npx json-file-merger ${path.join(testDir, 'cli-4.json')} --directory ${jsonDir} "${path.join(additionalDir, '*.json')}"`);
    console.log('✓ Combined CLI command successful');

    // Test silent mode
    execSync(`npx json-file-merger -s ${path.join(testDir, 'cli-5.json')} --directory ${jsonDir}`);
    console.log('✓ Silent mode CLI command successful');
  } catch (error) {
    console.error('CLI test failed:', error.message);
    process.exit(1);
  }

  console.log('\nAll tests completed successfully!');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 