const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const User = require('../modules/auth/auth.model');

  // Fetch a few users to see sessions/fcmTokens structure
  const users = await User.find({ role: 'USER' }).limit(10).lean();
  console.log("Total users found:", users.length);

  users.forEach((u, i) => {
    console.log(`User ${i + 1}:`);
    console.log("  ID:", u._id);
    console.log("  CreatedAt:", u.createdAt);
    console.log("  LastLoginAt:", u.lastLoginAt);
    console.log("  Sessions:", u.sessions);
    console.log("  fcmTokens:", u.fcmTokens);
  });

  // Let's count users by sessions platform
  const sessionPlatformCounts = await User.aggregate([
    { $match: { role: 'USER' } },
    { $unwind: { path: '$sessions', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$sessions.platform',
        count: { $sum: 1 }
      }
    }
  ]);
  console.log("Session Platform Counts:", sessionPlatformCounts);

  // Let's count users by fcmTokens platform
  const fcmPlatformCounts = await User.aggregate([
    { $match: { role: 'USER' } },
    { $unwind: { path: '$fcmTokens', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$fcmTokens.platform',
        count: { $sum: 1 }
      }
    }
  ]);
  console.log("fcmTokens Platform Counts:", fcmPlatformCounts);

  await mongoose.disconnect();
}

run().catch(console.error);
