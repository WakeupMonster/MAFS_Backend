const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require('dotenv').config();
const mongoose = require('mongoose');

async function create() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://wakeupstationwm_db_user:8XHClC8Jr8qoCIg5@cluster0.0pkfh93.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const GiveawayCampaign = require('./modules/Admin/giveaways/giveawayCampaign.model.js');
    const Prize = require('./modules/Admin/giveaways/prize.model.js');

    // 1. Find or Create a Prize
    let prize = await Prize.findOne();
    if (!prize) {
      prize = await Prize.create({
        title: "Test Prize",
        type: "OTHER",
        value: 0
      });
    }

    // 2. Create a TEST_LOCKED campaign for today
    const now = new Date();
    const camp = await GiveawayCampaign.create({
      title: "Private Test Campaign - Force Amaira",
      date: now,
      prizeId: prize._id,
      isActive: true,
      drawStatus: "TEST_LOCKED",
      participants: []
    });

    console.log("✅ Created TEST_LOCKED campaign for testing:", camp._id);
    console.log("🚀 Now wait for the cron or run the worker again.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}
create();
