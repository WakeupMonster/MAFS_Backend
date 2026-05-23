const dns = require('dns');
try {
  dns.setServers(['8.8.8.8']);
  console.log("DNS servers set to 8.8.8.8");
} catch (e) {
  console.warn("Could not set DNS servers:", e.message);
}

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

const firstToken = tokens[0];
console.log(`First token preview: ${firstToken.substring(0, 50)}...`);

let decoded;
try {
  decoded = jwt.verify(firstToken, process.env.JWT_SECRET);
  console.log("Decoded successfully:", decoded);
} catch (e) {
  console.error("❌ Token verification failed:", e.message);
  process.exit(1);
}

const userId = decoded.userId;

async function checkDb() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to:", uri.split('@')[1] || uri);
  await mongoose.connect(uri);
  console.log("✅ Connected");

  const User = require('../modules/auth/auth.model');
  const Profile = require('../modules/profile/profile.model');

  const user = await User.findById(userId);
  if (!user) {
    console.log(`❌ User with ID ${userId} not found in DB!`);
    
    // Let's count how many test users exist
    const totalTestUsers = await User.countDocuments({ isTest: true });
    console.log(`Total test users in DB: ${totalTestUsers}`);
  } else {
    console.log("✅ User found in DB:");
    console.log({
      _id: user._id,
      phone: user.phone,
      accountStatus: user.accountStatus,
      isPhoneVerified: user.isPhoneVerified,
      isProfileCompleted: user.isProfileCompleted,
      isTest: user.isTest,
      isFake: user.isFake,
    });

    const profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      console.log("❌ Profile not found for this user!");
    } else {
      console.log("✅ Profile found:", {
        nickname: profile.nickname,
        gender: profile.gender,
        isProfileComplete: profile.isProfileComplete,
      });
    }
  }

  await mongoose.disconnect();
}

checkDb().catch(e => {
  console.error(e);
  process.exit(1);
});
