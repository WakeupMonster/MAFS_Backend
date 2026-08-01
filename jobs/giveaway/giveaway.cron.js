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

// Safe Timezone check
let CURRENT_TZ = (process.env.APP_TIMEZONE || "Australia/Sydney").replace(/^"|"$/g, '');
try {
  Intl.DateTimeFormat(undefined, { timeZone: CURRENT_TZ });
} catch (e) {
  CURRENT_TZ = "UTC";
}

/*
  Friday ('5') at 18:00 (6 PM) in the calculated Timezone.
  "0 18 * * 5"
*/

// const cronSchedule = process.env.NODE_ENV === "development"
//   ? "*/1 * * * *"
//   : "0 18 * * 5";

const cronSchedule = process.env.NODE_ENV === "development"
  ? "*/1 * * * *"
  : "0 18 * * 5";

cron.schedule(cronSchedule, async () => {
  console.log(`🎯 Giveaway CRON triggered in Timezone: ${CURRENT_TZ}`);
  await runGiveawayJob();
}, {
  timezone: CURRENT_TZ
});