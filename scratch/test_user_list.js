const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected.");

  // Import models first
  require('../modules/auth/auth.model');
  require('../modules/profile/profile.model');

  const controller = require('../modules/Admin/usersManagement/user.management.controller');

  // Mock Request & Response
  const req = {
    query: {
      page: '1',
      limit: '10',
    }
  };

  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      console.log("\nStatus:", this.statusCode);
      console.log("Success:", data.success);
      if (data.success) {
        console.log("Fetched Users Count:", data.data.length);
        if (data.data.length > 0) {
          console.log("Sample User Profile age & dob:", data.data[0].profile);
        }
      } else {
        console.log("Error details:", data.message, data.error);
      }
    }
  };

  try {
    await controller.GETAllUsers(req, res);
  } catch (err) {
    console.error("Crash during execution:", err);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
