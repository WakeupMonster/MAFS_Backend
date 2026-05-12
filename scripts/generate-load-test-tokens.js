/**
 * MAFS Load Test — Token Generator
 * Generates 2,000 JWT tokens from seeded user IDs
 * 
 * Prerequisites: Run seed-load-test-users.js first
 * Usage: node scripts/generate-load-test-tokens.js
 */

require("dotenv").config();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const TOKEN_COUNT = 2000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not found in .env file!");
  console.error("   Make sure your .env file has JWT_SECRET=<your-secret>");
  process.exit(1);
}

// Load seeded user IDs
const idsPath = path.join(__dirname, "..", "k6", "data", "seeded_user_ids.json");

if (!fs.existsSync(idsPath)) {
  console.error("❌ seeded_user_ids.json not found!");
  console.error("   Run 'node scripts/seed-load-test-users.js' first.");
  process.exit(1);
}

const allUserIds = JSON.parse(fs.readFileSync(idsPath, "utf8"));
console.log(`📋 Found ${allUserIds.length} seeded user IDs`);

if (allUserIds.length < TOKEN_COUNT) {
  console.warn(`⚠️  Only ${allUserIds.length} users available. Generating ${allUserIds.length} tokens instead of ${TOKEN_COUNT}.`);
}

const count = Math.min(TOKEN_COUNT, allUserIds.length);
const tokens = [];

console.log(`\n🔐 Generating ${count} JWT tokens...\n`);

for (let i = 0; i < count; i++) {
  const userId = allUserIds[i];

  // Match EXACT payload format from auth.utils.js
  const token = jwt.sign(
    {
      userId: userId,
      role: "USER",
    },
    JWT_SECRET,
    {
      expiresIn: "15d", // Same as production access token expiry
    }
  );

  tokens.push(token);
}

// Save tokens for k6
const outputDir = path.join(__dirname, "..", "k6", "data");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Save as flat array (k6 SharedArray format)
fs.writeFileSync(
  path.join(outputDir, "load_test_tokens.json"),
  JSON.stringify(tokens, null, 2)
);

// Also save a mapping file for debugging (token index → userId)
const mapping = tokens.slice(0, 20).map((t, i) => ({
  index: i,
  userId: allUserIds[i],
  tokenPreview: t.substring(0, 50) + "...",
}));
fs.writeFileSync(
  path.join(outputDir, "token_mapping_sample.json"),
  JSON.stringify(mapping, null, 2)
);

console.log(`✅ Generated ${tokens.length} JWT tokens`);
console.log(`📁 Saved to: k6/data/load_test_tokens.json`);
console.log(`📁 Sample mapping: k6/data/token_mapping_sample.json`);
console.log(`\n⏱️  Tokens expire in 15 days from now.`);
console.log(`\n📌 Next step: Install k6 and run the load test!`);
console.log(`   k6 run k6/scripts/swipe_load_test.js\n`);
