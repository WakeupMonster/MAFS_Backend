const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected.");

  const controller = require('../modules/Admin/dashboard/dashboard.advanced.controller');

  // Helper to run query and return genderGrowth
  const getGenderGrowthData = async (preset) => {
    let result = null;
    const req = { query: { preset } };
    const res = {
      status: function() { return this; },
      json: function(data) { result = data.data?.genderGrowth; }
    };
    await controller.getAdvancedDashboardMetrics(req, res);
    return result;
  };

  try {
    const todayData = await getGenderGrowthData('today');
    console.log("\n--- TODAY PRESET ---");
    console.log(JSON.stringify(todayData, null, 2));

    const yesterdayData = await getGenderGrowthData('yesterday');
    console.log("\n--- YESTERDAY PRESET ---");
    console.log(JSON.stringify(yesterdayData, null, 2));

    const last7Data = await getGenderGrowthData('last7');
    console.log("\n--- LAST7 PRESET ---");
    console.log(JSON.stringify(last7Data, null, 2));

  } catch (err) {
    console.error("Crash during execution:", err);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
