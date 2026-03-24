/**
 * QUEUED PRIZE DELIVERY CRON
 * 
 * Schedule: Runs daily at 11:45 PM IST (after unsuspend job at 11:31 PM)
 * This ensures suspended users are first unsuspended, then their queued prizes are processed.
 */

const cron = require("node-cron");
const processQueuedPrizes = require("./queuedPrize.worker");

const cronSchedule = process.env.NODE_ENV === "development"
  ? "*/1 * * * *"    // Dev: Every 5 minutes for testing
  : "45 23 * * *";   // Prod: Daily at 11:45 PM IST

cron.schedule(cronSchedule, async () => {
  console.log("[QUEUED-PRIZE CRON] 🔔 Triggered at:", new Date().toISOString());
  await processQueuedPrizes();
}, {
  timezone: "Asia/Kolkata"
});

console.log("[QUEUED-PRIZE CRON] ✅ Registered. Schedule:", process.env.NODE_ENV === "development" ? "Every 5 min" : "Daily 11:45 PM IST");
