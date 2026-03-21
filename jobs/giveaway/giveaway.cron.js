// const cron = require("node-cron");
// const runGiveawayJob = require("./giveaway.worker");


// cron.schedule("11 12 * * *", async () => {
//   console.log("🎯 Giveaway cron started");
//   await runGiveawayJob();
// });



// // const cron = require("node-cron");
// // const runGiveawayJob = require("./giveaway.worker");

// // // ✅ 7:00 PM AEST daily
// // cron.schedule("0 19 * * *", async () => {
// //   console.log("🎯 Giveaway cron started");
// //   await runGiveawayJob();
// // }, {
// //   timezone: "Australia/Sydney"  // ✅ AEST/AEDT auto-handle
// // });


const cron = require("node-cron");
const runGiveawayJob = require("./giveaway.worker");

const CURRENT_TZ = process.env.GIVEAWAY_TIMEZONE || "Australia/Sydney";

/*
  Friday ('5') at 18:00 (6 PM) in the calculated Timezone.
  "0 18 * * 5"
*/

const cronSchedule = process.env.NODE_ENV === "development"
  ? "*/1 * * * *"   // <-- APP TESTING KE LIYE (Har 5 Minute chalegi test server par)
  : "0 18 * * 5";   // <-- PRODUCTION KE LIYE (Har Friday shaam 6 baje)

cron.schedule(cronSchedule, async () => {
  console.log(`🎯 Giveaway CRON triggered in Timezone: ${CURRENT_TZ}`);
  await runGiveawayJob();
}, {
  timezone: CURRENT_TZ
});