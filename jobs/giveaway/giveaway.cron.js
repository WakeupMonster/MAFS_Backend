const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

cron.schedule("5 0 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});