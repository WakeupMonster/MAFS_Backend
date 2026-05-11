const cron = require("node-cron");
const runDebugWorker = require("./test-debug.worker");

// Run every 1 minute
cron.schedule("*/1 * * * *", () => {
  runDebugWorker();
});

console.log("🛠️ [DEBUG CRON] Debug worker registered (Every 1 min)");
