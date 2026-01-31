const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

cron.schedule("3 14 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});