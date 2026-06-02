const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected.");

  const controller = require('../modules/Admin/dashboard/dashboard.advanced.controller');

  // Mock Request & Response
  const req = {
    query: {
      preset: 'today'
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
        console.log("Response Keys:", Object.keys(data.data));
        console.log("Conversion Funnel stages:", JSON.stringify(data.data.conversionFunnel.stages, null, 2));
        console.log("User Distribution response data:", data.data.userDistribution);
      } else {
        console.log("Error details:", data.message, data.error);
      }
    }
  };

  try {
    await controller.getAdvancedDashboardMetrics(req, res);
  } catch (err) {
    console.error("Crash during execution:", err);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
