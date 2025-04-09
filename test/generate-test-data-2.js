const fs = require('fs');
const path = require('path');

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Generate 1 million JSON objects with different structure
const writeStream = fs.createWriteStream(path.join(testDir, 'large-test-2.json'));
const totalObjects = 1000000;
let count = 0;

console.log('Generating second test data file...');

function writeNext() {
  if (count >= totalObjects) {
    writeStream.end();
    console.log('Second test data generation complete!');
    return;
  }

  const item = {
    productId: `PROD-${count.toString().padStart(6, '0')}`,
    title: `Product ${count}`,
    description: `This is a detailed description for product ${count} with some additional information about its features and specifications.`,
    price: (Math.random() * 1000).toFixed(2),
    stock: Math.floor(Math.random() * 1000),
    categories: ['Electronics', 'Gadgets', 'Accessories'],
    specifications: {
      brand: 'TestBrand',
      model: `MODEL-${count}`,
      weight: (Math.random() * 5).toFixed(2),
      dimensions: {
        length: Math.floor(Math.random() * 100),
        width: Math.floor(Math.random() * 100),
        height: Math.floor(Math.random() * 100)
      }
    },
    ratings: {
      average: (Math.random() * 5).toFixed(1),
      count: Math.floor(Math.random() * 1000)
    },
    lastUpdated: new Date().toISOString()
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