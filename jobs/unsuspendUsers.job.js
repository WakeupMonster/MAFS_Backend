const cron = require("node-cron");
const User = require("../modules/auth/auth.model");

const runUnsuspendUsersJob = () => {
  // Runs every 5 minutes
  cron.schedule("47 1 * * * *", async () => {
    try {
      const now = new Date();

      const usersToUnsuspend = await User.updateMany(
        {
          accountStatus: "suspended",
          "suspensionDetails.isSuspended": true,
          "suspensionDetails.suspendUntil": { $lte: now }
        },
        {
          $set: {
            accountStatus: "active",
            "suspensionDetails.isSuspended": false,
            "suspensionDetails.reason": null,
            "suspensionDetails.suspendedBy": null,
            "suspensionDetails.suspendedAt": null,
            "suspensionDetails.suspendUntil": null
          }
        }
      );

      if (usersToUnsuspend.modifiedCount > 0) {
        console.log(
          `[UNSUSPEND JOB] Unsuspended ${usersToUnsuspend.modifiedCount} users`
        );
      }
    } catch (error) {
      console.error("[UNSUSPEND JOB ERROR]", error);
    }
  });
};

module.exports = runUnsuspendUsersJob;