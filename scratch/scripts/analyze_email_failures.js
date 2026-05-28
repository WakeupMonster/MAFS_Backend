const mongoose = require("mongoose");
const EmailLog = require("../modules/Admin/adminNotificationCampaigns/emailLog.model");
require("dotenv").config();

async function checkErrors() {
  try {
    if (!process.env.MONGODB_URI) {
       console.error("MONGODB_URI not found in environment");
       process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const campaignId = "69da31d9112b4dfbf763f5d7";
    const failedLogs = await EmailLog.find({ campaignId, status: "failed" }).limit(100).lean();

    console.log(`Found ${failedLogs.length} failed logs for campaign ${campaignId}`);

    const errorCounts = {};
    failedLogs.forEach(log => {
      const err = log.error || "Unknown error";
      errorCounts[err] = (errorCounts[err] || 0) + 1;
    });

    console.log("Error Summary:");
    console.log(JSON.stringify(errorCounts, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkErrors();
