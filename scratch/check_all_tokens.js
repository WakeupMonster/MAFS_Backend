const dns = require('dns');
try {
  dns.setServers(['8.8.8.8']);
} catch (e) {}

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const tokensPath = path.join(__dirname, '..', 'k6', 'data', 'load_test_tokens.json');
if (!fs.existsSync(tokensPath)) {
  console.error("❌ load_test_tokens.json not found!");
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
console.log(`Loaded ${tokens.length} tokens.`);

async function checkAll() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const User = require('../modules/auth/auth.model');
  const Profile = require('../modules/profile/profile.model');

  const userIds = tokens.map(token => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.userId;
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  console.log(`Decoded ${userIds.length} user IDs from tokens.`);

  // Find all users from the tokens
  const dbUsers = await User.find({ _id: { $in: userIds } }).lean();
  console.log(`Found ${dbUsers.length} users in DB out of ${userIds.length} expected.`);

  const statusMap = {};
  const notActiveUsers = [];

  for (const user of dbUsers) {
    statusMap[user.accountStatus] = (statusMap[user.accountStatus] || 0) + 1;
    if (user.accountStatus !== 'active') {
      notActiveUsers.push(user);
    }
  }

  console.log("Account status distribution among found users:", statusMap);
  console.log(`Number of users not active: ${notActiveUsers.length}`);
  if (notActiveUsers.length > 0) {
    console.log("Sample not-active users (first 5):", notActiveUsers.slice(0, 5).map(u => ({ _id: u._id, phone: u.phone, accountStatus: u.accountStatus })));
  }

  // Check profiles for these users
  const dbProfiles = await Profile.find({ userId: { $in: userIds } }).lean();
  console.log(`Found ${dbProfiles.length} profiles in DB out of ${userIds.length} expected.`);

  await mongoose.disconnect();
}

checkAll().catch(e => {
  console.error(e);
  process.exit(1);
});
