/**
 * QUEUED PRIZE DELIVERY CRON
 *
 * Schedule: Runs daily at 11:45 PM AEST/AEDT (after unsuspend job at 4:55 PM AEST/AEDT)
 * This ensures suspended users are first unsuspended, then their queued prizes are processed.
 */

const cron = require("node-cron");
const processQueuedPrizes = require("./queuedPrize.worker");
const { APP_TZ } = require("../../common/utils/time");

const cronSchedule = process.env.NODE_ENV === "development"
  ? "*/1 * * * *"    // Dev: Every 5 minutes for testing
  : "45 23 * * *";   // Prod: Daily at 11:45 PM AEST/AEDT

// Safe Timezone check
let TZ = APP_TZ;
try {
  Intl.DateTimeFormat(undefined, { timeZone: TZ });
} catch (e) {
  TZ = "UTC";
}

cron.schedule(cronSchedule, async () => {
  console.log("[QUEUED-PRIZE CRON] 🔔 Triggered at:", new Date().toISOString());
  await processQueuedPrizes();
}, {
  timezone: TZ
});
console.log("[QUEUED-PRIZE CRON] ✅ Registered. Schedule:", process.env.NODE_ENV === "development" ? "Every 5 min" : "Daily 11:45 PM AEST/AEDT");