// const cron = require("node-cron");
// const User = require("../modules/auth/auth.model");

// const runUnsuspendUsersJob = () => {
//   // Runs every 5 minutes
//   cron.schedule("27 23  * * *", async () => {
//     console.log("job started")
//     try {
//       console.log("job started in try block")
//       const now = new Date();
//       const usersToUnsuspend = await User.updateMany(
//         {
//           accountStatus: "suspended",
//           "suspensionDetails.isSuspended": true,
//           "suspensionDetails.suspendUntil": { $lte: now }
//         },
//         {
//           $set: {
//             accountStatus: "active",
//             "suspensionDetails.isSuspended": false,
//             "suspensionDetails.reason": null,
//             "suspensionDetails.suspendedBy": null,
//             "suspensionDetails.suspendedAt": null,
//             "suspensionDetails.suspendUntil": null
//           }
//         }
//       );

//       if (usersToUnsuspend.modifiedCount > 0) {
//         console.log(
//           `[UNSUSPEND JOB] Unsuspended ${usersToUnsuspend.modifiedCount} users`
//         );
//       }
//     } catch (error) {
//       console.error("[UNSUSPEND JOB ERROR]", error);
//     }
//   });
// };
// runUnsuspendUsersJob();
// module.exports = runUnsuspendUsersJob;


const cron = require("node-cron");
const User = require("../modules/auth/auth.model");

const runUnsuspendUsersJob = () => {
  console.log("[UNSUSPEND JOB] ✅ Cron job registered, waiting for 11:30 PM IST...");

  cron.schedule("55 16 * * *", async () => {
    console.log("[UNSUSPEND JOB] 🚀 Job STARTED at:", new Date().toISOString());
    try {
      const now = new Date();
      const result = await User.updateMany(
        {
          accountStatus: "suspended",
          "suspensionDetails.isSuspended": true,
          "suspensionDetails.suspendUntil": { $lte: now },
        },
        {
          $set: {
            accountStatus: "active",
            "suspensionDetails.isSuspended": false,
            "suspensionDetails.reason": null,
            "suspensionDetails.suspendedBy": null,
            "suspensionDetails.suspendedAt": null,
            "suspensionDetails.suspendUntil": null,
          },
        }
      );

      console.log(`[UNSUSPEND JOB] ✅ Done. Modified: ${result.modifiedCount}`);
    } catch (error) {
      console.error("[UNSUSPEND JOB ERROR] ❌", error);
    }
  }, {
    timezone: "Asia/Kolkata"  // ✅ IST timezone
  });
};

// ✅ Directly call karo, export mat karo
runUnsuspendUsersJob();

module.exports = runUnsuspendUsersJob;