const cron = require("node-cron");
const  runPremiumExpiryReminderJob  = require("./premiumExpiryReminder.job");

cron.schedule("11 13 * * *", async () => {
  console.log("🎯 premim cron started");
  await runPremiumExpiryReminderJob();
},
 {
    timezone: "Asia/Kolkata"
  }
);