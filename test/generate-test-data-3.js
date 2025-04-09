const fs = require('fs');
const path = require('path');

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Generate a 2GB JSON file
const writeStream = fs.createWriteStream(path.join(testDir, 'huge-test.json'));
const targetSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
let currentSize = 0;
let count = 0;

console.log('Generating 2GB test data file...');

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function writeNext() {
  if (currentSize >= targetSize) {
    writeStream.end();
    console.log('\n2GB test data generation complete!');
    return;
  }

  const item = {
    recordId: `REC-${count.toString().padStart(8, '0')}`,
    timestamp: new Date().toISOString(),
    data: {
      type: 'transaction',
      amount: (Math.random() * 10000).toFixed(2),
      currency: 'USD',
      status: Math.random() > 0.5 ? 'completed' : 'pending',
      details: {
        customerId: `CUST-${Math.floor(Math.random() * 1000000)}`,
        orderId: `ORD-${Math.floor(Math.random() * 1000000)}`,
        items: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
          itemId: `ITEM-${Math.floor(Math.random() * 1000000)}`,
          quantity: Math.floor(Math.random() * 100) + 1,
          price: (Math.random() * 1000).toFixed(2),
          description: `Item ${i + 1} description with some additional details about the product and its specifications.`
        })),
        shipping: {
          address: `123${Math.floor(Math.random() * 1000)} Main St, City ${Math.floor(Math.random() * 1000)}`,
          method: Math.random() > 0.5 ? 'express' : 'standard',
          trackingNumber: `TRK-${Math.floor(Math.random() * 1000000000)}`
        }
      }
    },
    metadata: {
      source: 'test-system',
      version: '1.0',
      processedAt: new Date().toISOString()
    }
  };

  const jsonString = JSON.stringify(item) + '\n';
  const chunkSize = Buffer.byteLength(jsonString);

  writeStream.write(jsonString, () => {
    currentSize += chunkSize;
    count++;
    
    if (count % 10000 === 0) {
      process.stdout.write(`\rGenerated ${formatBytes(currentSize)} (${(currentSize / targetSize * 100).toFixed(1)}%)`);
    }
    
    writeNext();
  });
}

writeNext(); 