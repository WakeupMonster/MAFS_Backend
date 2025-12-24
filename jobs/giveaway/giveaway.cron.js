const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

/**
 * Daily Giveaway Cron
 * Runs every day at 00:05 AM
 */
cron.schedule("5 0 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});