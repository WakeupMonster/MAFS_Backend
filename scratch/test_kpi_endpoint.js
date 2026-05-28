const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected.");

  const controller = require('../modules/Admin/dashboard/dashboard.stats.controller');

  // Mock Request & Response
  const req = {};

  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      console.log("\nStatus:", this.statusCode);
      console.log("Success:", data.success);
      if (data.success) {
        console.log("Response data KPIs keys:", Object.keys(data.data.kpis));
        const history = data.data.kpis.visitorHistory;
        console.log("Visitor History sample (first 3):", history.slice(0, 3));
        console.log("Visitor History sample (last 3):", history.slice(-3));
        console.log("Visitor History length:", history.length);
      } else {
        console.log("Error details:", data.message);
      }
    }
  };

  try {
    await controller.getKpiOverview(req, res);
  } catch (err) {
    console.error("Crash during execution:", err);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
