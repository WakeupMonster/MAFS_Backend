const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

cron.schedule("46 13 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});