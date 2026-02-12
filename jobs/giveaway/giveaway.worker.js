// const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
// const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
// const User = require("../../modules/auth/auth.model");
// const notificationService = require("../../modules/notifications/notification.service");
// const Prize = require("../../modules/giveaway/prize.model");

// module.exports = async function runGiveawayWorker() {
//   const today = new Date();
//   // today.setHours(0, 0, 0, 0);
//     today.setUTCHours(0, 0, 0, 0);
// console.log(today)
// //   const settings = await GiveawaySettings.findOne();
// // const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

// console.log("campaign starting")
//   const campaign = await GiveawayCampaign.findOne({
//     date: today,
//     isActive: true,
//     drawStatus: "PENDING"
//   });

//   if (!campaign) {
//     console.log("ℹ️ No pending giveaway campaign today");
//     return;
//   }

//   /**
//    * ======================================
//    * 2️⃣ Lock campaign (crash-safe)
//    * ======================================
//    */
//   campaign.drawStatus = "PROCESSING";
//   await campaign.save();

//   try {
//     const currentYear = new Date().getFullYear();

//     const [winner] = await User.aggregate([
//       {
//         $match: {
//           isPremium: true,
//           accountStatus: "active"
//         }
//       },
//       {
//         $lookup: {
//           from: "giveawaywinhistories",
//           let: { userId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$userId", "$$userId"] },
//                     { $eq: ["$year", currentYear] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "winsThisYear"
//         }
//       },
//       {
//         $match: {
//           $expr: {
//             $lt: [{ $size: "$winsThisYear" }, 2]
//           }
//         }
//       },
//       {
//         $sample: { size: 1 }
//       },
//       {
//         $project: { _id: 1 }
//       }
//     ]);

//     if (!winner) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No eligible users (yearly limit reached)";
//       console.log("no winner found")
//       await campaign.save();
//       return;
//     }
//     await GiveawayWinHistory.create({
//       userId: winner._id,
//       campaignId: campaign._id,
//       prizeId: campaign.prizeId,
//       year: currentYear
//     });

//     const prize = await Prize.findById(campaign.prizeId).select("title");
//     const winnerUserId = winner._id;
    
//     campaign.winnerUserId = winner._id;
//     campaign.drawStatus = "COMPLETED";
//     campaign.drawAt = new Date();
//     await campaign.save();


//     await notificationService.sendGiveawayWinnerNotification(
//   winnerUserId,
//   prize.title
// );

//     console.log("✅ Giveaway completed successfully");

//   } catch (error) {
//     console.error("❌ Giveaway worker failed:", error);

//     campaign.drawStatus = "PENDING";
//     campaign.failureReason = error.message;
//     await campaign.save();
//   }
// };





const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
const User = require("../../modules/auth/auth.model");
const Match = require("../../modules/matches/swipe/swipe.model");
const notificationService = require("../../modules/notifications/notification.service");
const Prize = require("../../modules/giveaway/prize.model");
const GiveawaySettings = require("../../modules/giveaway/giveawaySettings.model");

dayjs.extend(utc);
dayjs.extend(timezone);

const IST_TZ = "Asia/Kolkata";

module.exports = async function runGiveawayWorker() {
  console.log("🎯 Giveaway worker started at:", new Date().toISOString());

  try {
    /**
     * ===============================
     * 1️⃣ Find today's campaign
     * Campaign UTC midnight pe stored hai
     * IST midnight pe bhi check karo
     * ===============================
     */

    // Method: UTC midnight for today (matches how campaign is created)
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

    // IST range for today
    const startOfTodayIST = dayjs().tz(IST_TZ).startOf("day").toDate();
    const endOfTodayIST = dayjs().tz(IST_TZ).endOf("day").toDate();

    console.log("📅 UTC today:", todayUTC);
    console.log("📅 IST range:", startOfTodayIST, "→", endOfTodayIST);

    const settings = await GiveawaySettings.findOne();
    const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

    // ✅ Search with $or - dono cases cover
    const campaign = await GiveawayCampaign.findOne({
      $or: [
        { date: todayUTC },                                          // exact UTC midnight match
        { date: { $gte: startOfTodayIST, $lt: endOfTodayIST } }    // IST range match
      ],
      isActive: true,
      drawStatus: "PENDING"
    });

    // ✅ Debug logs
    if (!campaign) {
      console.log("ℹ️ No pending giveaway campaign today");

      // Debug: show what's in DB
      const allCampaigns = await GiveawayCampaign.find({
        drawStatus: "PENDING",
        isActive: true
      }).select("date drawStatus isActive").limit(5);
      console.log("📋 Pending campaigns in DB:", allCampaigns);

      return;
    }

    console.log("✅ Campaign found:", campaign._id, "Date:", campaign.date);

    /**
     * ===============================
     * 2️⃣ Lock campaign
     * ===============================
     */
    campaign.drawStatus = "PROCESSING";
    await campaign.save();
    console.log("🔒 Campaign locked for processing");

    const nowIST = dayjs().tz(IST_TZ);
    const currentYear = nowIST.year();

    /**
     * ===============================
     * 3️⃣ Giveaway window = YESTERDAY (IST)
     * ===============================
     */
    const giveawayStart = nowIST.subtract(1, "day").startOf("day").toDate();
    const giveawayEnd = nowIST.subtract(1, "day").endOf("day").toDate();

    console.log("🎰 Match window:", giveawayStart, "→", giveawayEnd);

    /**
     * ===============================
     * 4️⃣ Users with ≥1 match in window
     * ===============================
     */
    const matchedUsers = await Match.aggregate([
      {
        $match: {
          matchedAt: { $gte: giveawayStart, $lte: giveawayEnd }
        }
      },
      { $unwind: "$users" },
      { $group: { _id: "$users" } }
    ]);

    console.log("👥 Matched users count:", matchedUsers.length);

    if (!matchedUsers.length) {
      campaign.drawStatus = "COMPLETED";
      campaign.failureReason = "No matches in giveaway window";
      await campaign.save();
      console.log("⚠️ No matches found in window");
      return;
    }

    const matchedUserIds = matchedUsers.map(u => u._id);

    /**
     * ===============================
     * 5️⃣ Pick winner
     * ===============================
     */
    const [winner] = await User.aggregate([
      {
        $match: {
          _id: { $in: matchedUserIds },
          isPremium: true,
          accountStatus: "active",
          premiumExpiresAt: { $gt: new Date() }
        }
      },
      {
        $lookup: {
          from: "giveawaywinhistories",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$year", currentYear] }
                  ]
                }
              }
            }
          ],
          as: "winsThisYear"
        }
      },
      {
        $match: {
          $expr: { $lt: [{ $size: "$winsThisYear" }, yearlyLimit] }
        }
      },
      { $sample: { size: 1 } },
      { $project: { _id: 1 } }
    ]);

    console.log("🏆 Winner:", winner ? winner._id : "NONE FOUND");

    if (!winner) {
      campaign.drawStatus = "COMPLETED";
      campaign.failureReason = "No eligible users after filters";
      await campaign.save();
      console.log("⚠️ No eligible winner found");
      return;
    }

    /**
     * ===============================
     * 6️⃣ Save win + complete
     * ===============================
     */
    await GiveawayWinHistory.create({
      userId: winner._id,
      campaignId: campaign._id,
      prizeId: campaign.prizeId,
      year: currentYear
    });

    const prize = await Prize.findById(campaign.prizeId).select("title");

    campaign.winnerUserId = winner._id;
    campaign.drawStatus = "COMPLETED";
    campaign.drawAt = new Date();
    await campaign.save();

    await notificationService.sendGiveawayWinnerNotification(
      winner._id,
      prize.title
    );

    console.log("✅ Giveaway completed! Winner:", winner._id);

  } catch (error) {
    console.error("❌ Giveaway worker FAILED:", error.message);
    console.error(error.stack);

    // Try to reset campaign
    try {
      const campaign = await GiveawayCampaign.findOne({ drawStatus: "PROCESSING" });
      if (campaign) {
        campaign.drawStatus = "PENDING";
        campaign.failureReason = error.message;
        await campaign.save();
      }
    } catch (resetErr) {
      console.error("❌ Reset also failed:", resetErr);
    }
  }
};








































































// const dayjs = require("dayjs");
// const utc = require("dayjs/plugin/utc");
// const timezone = require("dayjs/plugin/timezone");

// const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
// const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
// const User = require("../../modules/auth/auth.model");
// const Match = require("../../modules/matches/swipe/swipe.model");
// const notificationService = require("../../modules/notifications/notification.service");
// const Prize = require("../../modules/giveaway/prize.model");
// const GiveawaySettings = require("../../modules/giveaway/giveawaySettings.model");

// dayjs.extend(utc);
// dayjs.extend(timezone);


// const IST_TZ = "Asia/Kolkata";

// module.exports = async function runGiveawayWorker() {
//   console.log("🎯 Giveaway worker started (IST)");

//   /**
//    * ===============================
//    * 1️⃣ Find today's campaign (IST day)
//    * ===============================
//    */

//   const startOfToday = dayjs()
//     .tz(IST_TZ)
//     .startOf("day")
//     .toDate();

//   const startOfTomorrow = dayjs(startOfToday)
//     .add(1, "day")
//     .toDate();

//   console.log("🧪 Campaign day range (IST):", startOfToday, startOfTomorrow);

//   const settings = await GiveawaySettings.findOne();
//   const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

//   const campaign = await GiveawayCampaign.findOne({
//     date: {
//       $gte: startOfToday,
//       $lte: startOfTomorrow
//     },
//     isActive: true,
//     drawStatus: "PENDING"
//   });

//   if (!campaign) {
//     console.log("ℹ️ No pending giveaway campaign today (IST)");
//     return;
//   }

//   /**
//    * ===============================
//    * 2️⃣ Lock campaign
//    * ===============================
//    */
//   campaign.drawStatus = "PROCESSING";
//   await campaign.save();

//   try {
//     const nowIST = dayjs().tz(IST_TZ);
//     const currentYear = nowIST.year();

//     /**
//      * ===============================
//      * 3️⃣ Giveaway window = YESTERDAY (IST)
//      * 00:00 → 23:59
//      * ===============================
//      */

//     const giveawayStart = nowIST
//       .subtract(1, "day")
//       .startOf("day")
//       .toDate();

//     const giveawayEnd = nowIST
//       .subtract(1, "day")
//       .endOf("day")
//       .toDate();

//     console.log("🧪 Giveaway window (IST):", giveawayStart, giveawayEnd);

//     /**
//      * ===============================
//      * 4️⃣ Users with ≥1 match in window
//      * ===============================
//      */
//     const matchedUsers = await Match.aggregate([
//       {
//         $match: {
//           matchedAt: {
//             $gte: giveawayStart,
//             $lte: giveawayEnd
//           }
//         }
//       },
//       { $unwind: "$users" },
//       { $group: { _id: "$users" } }
//     ]);

//     if (!matchedUsers.length) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No matches in giveaway window";
//       await campaign.save();
//       return;
//     }

//     const matchedUserIds = matchedUsers.map(u => u._id);

//     /**
//      * ===============================
//      * 5️⃣ Pick winner (Premium + yearly limit)
//      * ===============================
//      */
//     const [winner] = await User.aggregate([
//       {
//         $match: {
//           _id: { $in: matchedUserIds },
//           isPremium: true,
//           accountStatus: "active",
//           premiumExpiresAt: { $gt: new Date() }
//         }
//       },
//       {
//         $lookup: {
//           from: "giveawaywinhistories",
//           let: { userId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$userId", "$$userId"] },
//                     { $eq: ["$year", currentYear] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "winsThisYear"
//         }
//       },
//       {
//         $match: {
//           $expr: {
//             $lt: [{ $size: "$winsThisYear" }, yearlyLimit]
//           }
//         }
//       },
//       { $sample: { size: 1 } },
//       { $project: { _id: 1 } }
//     ]);

//     if (!winner) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No eligible users after filters";
//       await campaign.save();
//       return;
//     }

//     /**
//      * ===============================
//      * 6️⃣ Save win + complete campaign
//      * ===============================
//      */
//     await GiveawayWinHistory.create({
//       userId: winner._id,
//       campaignId: campaign._id,
//       prizeId: campaign.prizeId,
//       year: currentYear
//     });

//     const prize = await Prize.findById(campaign.prizeId).select("title");

//     campaign.winnerUserId = winner._id;
//     campaign.drawStatus = "COMPLETED";
//     campaign.drawAt = new Date();
//     await campaign.save();

//     await notificationService.sendGiveawayWinnerNotification(
//       winner._id,
//       prize.title
//     );

//     console.log("✅ Giveaway completed successfully (IST)");

//   } catch (error) {
//     console.error("❌ Giveaway worker failed:", error);

//     campaign.drawStatus = "PENDING";
//     campaign.failureReason = error.message;
//     await campaign.save();
//   }
// };








// // module.exports = async function runGiveawayWorker() {

// //   const today = dayjs()
// //   .tz("Australia/Sydney")
// //   .startOf("day")
// //   .toDate();

// //    console.log("🧪 Today (server TZ):", today);

// //        const settings = await GiveawaySettings.findOne();
// // const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;


// //   const campaign = await GiveawayCampaign.findOne({
// //     date: today,
// //     isActive: true,
// //     drawStatus: "PENDING"
// //   });

// //   if (!campaign) {
// //     console.log("ℹ️ No pending giveaway campaign today");
// //     return;
// //   }


// //   campaign.drawStatus = "PROCESSING";
// //   await campaign.save();

// //   try {
// //     const nowAEST = dayjs().tz(AEST_TZ);
// //     const currentYear = nowAEST.year();


// //     const giveawayDate = nowAEST
// //       .subtract(1, "day")
// //       .format("YYYY-MM-DD");

// //     const giveawayStart = dayjs
// //       .tz(`${giveawayDate} 00:00:00`, AEST_TZ)
// //       .toDate();

// //     const giveawayEnd = dayjs
// //       .tz(`${giveawayDate} 23:59:59`, AEST_TZ)
// //       .toDate();

// //     const matchedUsers = await Match.aggregate([
// //       {
// //         $match: {
// //           matchedAt: {
// //             $gte: giveawayStart,
// //             $lte: giveawayEnd
// //           }
// //         }
// //       },
// //       { $unwind: "$users" },
// //       { $group: { _id: "$users" } }
// //     ]);

// //     if (!matchedUsers.length) {
// //       campaign.drawStatus = "COMPLETED";
// //       campaign.failureReason = "No matches in giveaway window";
// //       await campaign.save();
// //       return;
// //     }

// //     const matchedUserIds = matchedUsers.map(u => u._id);

 
// //     const [winner] = await User.aggregate([
// //       {
// //         $match: {
// //           _id: { $in: matchedUserIds },
// //           isPremium: true,
// //           accountStatus: "active",
// //           premiumExpiresAt: { $gt: new Date() }
// //         }
// //       },
// //       {
// //         $lookup: {
// //           from: "giveawaywinhistories",
// //           let: { userId: "$_id" },
// //           pipeline: [
// //             {
// //               $match: {
// //                 $expr: {
// //                   $and: [
// //                     { $eq: ["$userId", "$$userId"] },
// //                     { $eq: ["$year", currentYear] }
// //                   ]
// //                 }
// //               }
// //             }
// //           ],
// //           as: "winsThisYear"
// //         }
// //       },
// //       {
// //         $match: {
// //           $expr: { $lt: [{ $size: "$winsThisYear" }, yearlyLimit] }
// //         }
// //       },
// //       { $sample: { size: 1 } },
// //       { $project: { _id: 1 } }
// //     ]);

// //     if (!winner) {
// //       campaign.drawStatus = "COMPLETED";
// //       campaign.failureReason = "No eligible users after filters";
// //       await campaign.save();
// //       return;
// //     }

// //     await GiveawayWinHistory.create({
// //       userId: winner._id,
// //       campaignId: campaign._id,
// //       prizeId: campaign.prizeId,
// //       year: currentYear
// //     });

// //     const prize = await Prize.findById(campaign.prizeId).select("title");

// //     campaign.winnerUserId = winner._id;
// //     campaign.drawStatus = "COMPLETED";
// //     campaign.drawAt = new Date();
// //     await campaign.save();

// //     await notificationService.sendGiveawayWinnerNotification(
// //       winner._id,
// //       prize.title
// //     );

// //     console.log("✅ Giveaway completed successfully");

// //   } catch (error) {
// //     console.error("❌ Giveaway worker failed:", error);

// //     campaign.drawStatus = "PENDING";
// //     campaign.failureReason = error.message;
// //     await campaign.save();
// //   }
// // };



