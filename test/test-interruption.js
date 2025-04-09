const fs = require('fs');
const path = require('path');
const { mergeJsonFiles, formatBytes } = require('../dist/index');
const { getJsonFilesFromDirectory } = require('../src/utils/file-utils');

module.exports = async function testInterruption() {
  const testDir = path.join(__dirname, 'data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const outputFile = path.join(testDir, 'interrupted-output.json');
  const testFile = path.join(testDir, 'interrupt-test.json');
  
  // Create a large test file
  console.log('Creating test file...');
  const writeStream = fs.createWriteStream(testFile);
  const targetSize = 500 * 1024 * 1024; // 500MB
  let currentSize = 0;
  
  // Create test file with promise to ensure it's fully written
  await new Promise((resolve, reject) => {
    function writeNext() {
      if (currentSize >= targetSize) {
        writeStream.end(() => resolve());
        return;
      }

      // Write a batch of items
      for (let i = 0; i < 1000 && currentSize < targetSize; i++) {
        const item = {
          id: Math.floor(currentSize / 1000),
          data: 'x'.repeat(1000),
          timestamp: new Date().toISOString()
        };
        const jsonString = JSON.stringify(item) + '\n';
        writeStream.write(jsonString);
        currentSize += jsonString.length;
      }

      if (currentSize % (10 * 1024 * 1024) === 0) { // Log every 10MB
        process.stdout.write(`\rCreated ${(currentSize / 1024 / 1024).toFixed(1)}MB`);
      }
      
      // Use setImmediate to prevent blocking
      setImmediate(writeNext);
    }
    
    writeStream.on('error', reject);
    writeNext();
  });
  
  console.log('\nTest file created, starting merge...');
  console.log('Press Ctrl+C after a few seconds to interrupt the process...');
  
  // Add a small delay to make sure the file is fully written
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    await mergeJsonFiles(
      [testFile],
      outputFile,
      {
        onProgress: (progressInfo) => {
          process.stdout.write(
            `\rProgress: ${progressInfo.progress.toFixed(1)}% ` +
            `(${formatBytes(progressInfo.processedBytes)} processed) ` +
            `[${progressInfo.speed.toFixed(1)} MB/s] ` +
            `[Buffer: ${formatBytes(progressInfo.bufferSize)}]`
          );
        }
      }
    );
  } catch (error) {
    console.log('\nProcess interrupted!');
    
    // Wait a moment for file system to sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if output file exists and contains valid JSON
    if (fs.existsSync(outputFile)) {
      const content = fs.readFileSync(outputFile, 'utf8');
      console.log('\nOutput file size:', (content.length / 1024 / 1024).toFixed(2), 'MB');
      
      try {
        // Try to parse the content as JSON by adding the closing bracket
        const jsonContent = content + '\n]';
        const data = JSON.parse(jsonContent);
        console.log('Output file contains valid JSON when closed!');
        console.log('Number of items:', data.length);
        
        // Check the last few items
        if (data.length > 0) {
          console.log('\nLast item:', JSON.stringify(data[data.length - 1]));
        }
        
        // Check if the JSON was properly terminated
        if (content.trim().endsWith(']')) {
          console.log('JSON was properly terminated with ]');
        } else {
          console.log('JSON was not terminated (as expected during interruption)');
          console.log('But the data written so far is valid JSON when closed');
        }
      } catch (e) {
        console.log('Output file contains invalid JSON:', e.message);
      }
    } else {
      console.log('No output file was created');
    }
  }
};

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, cleaning up...');
  process.exit(0);
}); 