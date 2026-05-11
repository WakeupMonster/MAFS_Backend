const mongoose = require("mongoose");
const GiveawayCampaign = require("../../modules/Admin/giveaways/giveawayCampaign.model");

module.exports = async function runDebugWorker() {
  console.log("------------------------------------------");
  console.log("🔍 DEBUG WORKER - Checking Giveaway Campaigns");
  console.log("⏰ Time:", new Date().toISOString());
  console.log("📂 DB Name:", mongoose.connection.name);
  
  try {
    const allCount = await GiveawayCampaign.countDocuments();
    const pending = await GiveawayCampaign.find({ 
      drawStatus: { $in: ["PENDING", "TEST_LOCKED", "TEST_PENDING"] } 
    }).lean();
    
    console.log("📊 Total Campaigns in DB:", allCount);
    console.log("🔎 Pending/Locked Campaigns:", pending.map(c => ({
      id: c._id,
      title: c.title,
      status: c.drawStatus,
      date: c.date
    })));
  } catch (err) {
    console.error("❌ DEBUG WORKER FAILED:", err.message);
  }
  console.log("------------------------------------------");
};
