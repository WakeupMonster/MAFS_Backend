const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");


cron.schedule("11 12 * * *", async () => {
  console.log("🎯 Giveaway cron started");
  await runGiveawayJob();
});



// const cron = require("node-cron");
// const runGiveawayJob = require("./giveaway.worker");

// // ✅ 7:00 PM AEST daily
// cron.schedule("0 19 * * *", async () => {
//   console.log("🎯 Giveaway cron started");
//   await runGiveawayJob();
// }, {
//   timezone: "Australia/Sydney"  // ✅ AEST/AEDT auto-handle
// });