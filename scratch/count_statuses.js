const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const User = require('../modules/auth/auth.model');
  
  const counts = await User.aggregate([
    {
      $group: {
        _id: '$accountStatus',
        count: { $sum: 1 }
      }
    }
  ]);
  
  console.log("Account Status Counts:", counts);
  await mongoose.disconnect();
}

run().catch(console.error);
