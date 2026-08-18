const cron = require("node-cron");
const runPremiumExpiryReminderJob = require("./premiumExpiryReminder.job");

// Safe Timezone check
let TZ = process.env.APP_TIMEZONE || "Australia/Sydney";
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