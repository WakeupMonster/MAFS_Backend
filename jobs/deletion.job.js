const cron = require("node-cron");
const {
  permanentDeleteAccounts,
} = require("../modules/Account/deactivate & active/account.controller");

// Safe Timezone check
let TZ = process.env.APP_TIMEZONE || "Australia/Sydney";
try {
  Intl.DateTimeFormat(undefined, { timeZone: TZ });
} catch (e) {
  TZ = "UTC";
}

cron.schedule(
  "50 18 * * *", // daily at 3 AM
  async () => {
    console.log("Running permanent delete cron...");

    await permanentDeleteAccounts();
  },
  {
    timezone: TZ,
  }
);
