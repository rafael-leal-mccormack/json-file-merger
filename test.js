const fs = require('fs');
const path = require('path');
const { mergeJsonFiles } = require('./src');

// Create test files
const testDir = path.join(__dirname, 'test-files');
fs.mkdirSync(testDir, { recursive: true });

// Create test JSON files
const file1 = path.join(testDir, 'file1.json');
const file2 = path.join(testDir, 'file2.json');
const outputFile = path.join(testDir, 'merged.json');

// Write test data
fs.writeFileSync(file1, JSON.stringify({ id: 1, name: 'Test 1' }, null, 2));
fs.writeFileSync(file2, JSON.stringify({ id: 2, name: 'Test 2' }, null, 2));

// Test the merger
async function test() {
  try {
    await mergeJsonFiles([file1, file2], outputFile);
    console.log('Test successful!');
    
    // Verify the output
    const mergedContent = fs.readFileSync(outputFile, 'utf8');
    console.log('Merged content:', mergedContent);
    
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test(); 