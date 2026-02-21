const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

cron.schedule("24 23 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});
