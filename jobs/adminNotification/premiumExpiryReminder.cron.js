const cron = require("node-cron");
const runPremiumExpiryReminderJob = require("./premiumExpiryReminder.job");

// Safe Timezone check
let TZ = "Asia/Kolkata";
try {
  Intl.DateTimeFormat(undefined, { timeZone: TZ });
} catch (e) {
  TZ = "UTC";
}

cron.schedule("6 15 * * *", async () => {
  console.log("🎯 premium expiry cron started");
  await runPremiumExpiryReminderJob();
},
  {
    timezone: TZ
  }
);