require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const GiveawayWinHistory = require('./modules/Admin/giveaways/giveawayWinHistory.model.js');
    const GiveawayCampaign = require('./modules/Admin/giveaways/giveawayCampaign.model.js');

    console.log("=== Latest Campaigns ===");
    const campaigns = await GiveawayCampaign.find().sort({ createdAt: -1 }).limit(3);
    console.log(campaigns);

    console.log("=== Latest Wins ===");
    const wins = await GiveawayWinHistory.find().sort({ createdAt: -1 }).limit(3);
    console.log(wins);

  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}
test();