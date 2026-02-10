const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

cron.schedule("11 15 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});