const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");


cron.schedule("36 11 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});