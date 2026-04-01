const fs = require('fs');
const path = require('path');

/**
 * generate_k6_data.js
 * Generates unique test phone numbers in the +1000... range.
 */

const COUNT = process.env.COUNT || 100;
const OUTPUT_DIR = path.join(__dirname, '../k6/data');
const FILE_PATH = path.join(OUTPUT_DIR, 'test_phones.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const generateData = () => {
  const phones = [];
  for (let i = 0; i < COUNT; i++) {
    // Format: +1000 followed by 7-10 digits, padded to ensure uniqueness/length
    const suffix = String(i).padStart(7, '0');
    phones.push({
      phone: `+1000${suffix}`,
      id: i
    });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(phones, null, 2));
  console.log(`✅ Generated ${COUNT} test phone numbers in ${FILE_PATH}`);
};

generateData();
