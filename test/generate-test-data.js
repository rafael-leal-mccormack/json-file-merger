const fs = require('fs');
const path = require('path');

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Generate 1 million JSON objects
const writeStream = fs.createWriteStream(path.join(testDir, 'large-test.json'));
const totalObjects = 1000000;
let count = 0;

console.log('Generating test data...');

function writeNext() {
  if (count >= totalObjects) {
    writeStream.end();
    console.log('Test data generation complete!');
    return;
  }

  const item = {
    id: count,
    name: `Item ${count}`,
    value: Math.random() * 1000,
    timestamp: new Date().toISOString(),
    tags: ['tag1', 'tag2', 'tag3'],
    metadata: {
      category: 'test',
      priority: Math.floor(Math.random() * 5),
      status: 'active'
    }
  };

  writeStream.write(JSON.stringify(item) + '\n', () => {
    count++;
    if (count % 100000 === 0) {
      console.log(`Generated ${count} objects...`);
    }
    writeNext();
  });
}

writeNext(); 