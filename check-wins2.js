const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://wakeupstationwm_db_user:8XHClC8Jr8qoCIg5@cluster0.0pkfh93.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const GiveawayWinHistory = require('./modules/Admin/giveaways/giveawayWinHistory.model.js');
    const GiveawayCampaign = require('./modules/Admin/giveaways/giveawayCampaign.model.js');
    
    console.log("=== Latest Campaigns ===");
    const campaigns = await GiveawayCampaign.find().sort({ createdAt: -1 }).limit(3);
    campaigns.forEach(c => {
      console.log(`Camp: ${c._id}, Date: ${c.date}, Status: ${c.drawStatus}, Winner: ${c.winnerUserId}`);
    });

    console.log("=== Latest Wins ===");
    const wins = await GiveawayWinHistory.find().sort({ createdAt: -1 }).limit(3);
    wins.forEach(w => {
      console.log(`Win ID: ${w._id}, User: ${w.userId}, Campaign: ${w.campaignId}, CreatedAt: ${w.createdAt}`);
    });
    
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}
check();
