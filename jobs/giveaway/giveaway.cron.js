const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");


cron.schedule("19 12 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});