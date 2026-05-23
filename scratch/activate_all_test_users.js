const dns = require('dns');
try {
  dns.setServers(['8.8.8.8']);
} catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

async function activateAll() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const User = require('../modules/auth/auth.model');

  // Update all test users to active
  const result = await User.updateMany(
    { isTest: true },
    { $set: { accountStatus: 'active' } }
  );

  console.log(`Updated ${result.modifiedCount} test users to 'active' status.`);
  
  // Let's verify
  const remainingNotActive = await User.countDocuments({ isTest: true, accountStatus: { $ne: 'active' } });
  console.log(`Remaining test users that are NOT active: ${remainingNotActive}`);

  await mongoose.disconnect();
}

activateAll().catch(e => {
  console.error(e);
  process.exit(1);
});
