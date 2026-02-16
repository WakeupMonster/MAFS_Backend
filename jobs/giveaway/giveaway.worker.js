// const dayjs = require("dayjs");
// const utc = require("dayjs/plugin/utc");
// const timezone = require("dayjs/plugin/timezone");

// const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
// const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
// const User = require("../../modules/auth/auth.model");
// const {Match} = require("../../modules/matches/swipe/swipe.model");
// const notificationService = require("../../modules/notifications/notification.service");
// const Prize = require("../../modules/giveaway/prize.model");
// const GiveawaySettings = require("../../modules/giveaway/giveawaySettings.model");

// dayjs.extend(utc);
// dayjs.extend(timezone);

// const IST_TZ = "Asia/Kolkata";


// module.exports = async function runGiveawayWorker() {
//   console.log("🎯 Giveaway worker started at:", new Date().toISOString());

//   try {
//     // ===============================
//     // 1️⃣ Find today's campaign
//     // ===============================
//     const todayUTC = new Date();
//     todayUTC.setUTCHours(0, 0, 0, 0);

//     const startOfTodayIST = dayjs().tz(IST_TZ).startOf("day").toDate();
//     const endOfTodayIST = dayjs().tz(IST_TZ).endOf("day").toDate();

//     const settings = await GiveawaySettings.findOne();
//     const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

//     const campaign = await GiveawayCampaign.findOne({
//       $or: [
//         { date: todayUTC },
//         { date: { $gte: startOfTodayIST, $lt: endOfTodayIST } }
//       ],
//       isActive: true,
//       drawStatus: "PENDING"
//     });

//     if (!campaign) {
//       console.log("ℹ️ No pending giveaway campaign today");
//       return;
//     }

//     console.log("✅ Campaign found:", campaign._id);

//     // ===============================
//     // 2️⃣ Lock campaign
//     // ===============================
//     campaign.drawStatus = "PROCESSING";
//     await campaign.save();

//     const nowIST = dayjs().tz(IST_TZ);
//     const currentYear = nowIST.year();

//     // ===============================
//     // 3️⃣ Match window = TODAY (IST)
//     // ===============================
//     const giveawayStart = nowIST.startOf("day").toDate();
//     const giveawayEnd = nowIST.endOf("day").toDate();

//     console.log("🎰 Match window:", giveawayStart, "→", giveawayEnd);

//     // ===============================
//     // 4️⃣ ALL matched users in window
//     // ===============================
//     const matchedUsers = await Match.aggregate([
//       {
//         $match: {
//           matchedAt: { $gte: giveawayStart, $lte: giveawayEnd }
//         }
//       },
//       { $unwind: "$users" },
//       { $group: { _id: "$users" } }
//     ]);

//     console.log("👥 Total matched users:", matchedUsers.length);

//     if (!matchedUsers.length) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No matches in giveaway window";
//       campaign.matchWindowStart = giveawayStart;
//       campaign.matchWindowEnd = giveawayEnd;
//       await campaign.save();
//       return;
//     }

//     const matchedUserIds = matchedUsers.map(u => u._id);

//     // ===============================
//     // ✅ 5️⃣ Save ALL participants in campaign
//     // ===============================
//     campaign.participants = matchedUserIds;
//     campaign.totalParticipants = matchedUserIds.length;
//     campaign.matchWindowStart = giveawayStart;
//     campaign.matchWindowEnd = giveawayEnd;
//     await campaign.save();

//     console.log("📋 Participants saved:", matchedUserIds.length);

//     // ===============================
//     // 6️⃣ Pick winner (Premium + yearly limit)
//     // ===============================
//     const [winner] = await User.aggregate([
//       {
//         $match: {
//           _id: { $in: matchedUserIds },
//           isPremium: true,
//           accountStatus: "active",
//           // premiumExpiresAt: { $gt: new Date() }
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
//           $expr: { $lt: [{ $size: "$winsThisYear" }, yearlyLimit] }
//         }
//       },
//       { $sample: { size: 1 } },
//       { $project: { _id: 1 } }
//     ]);

//     console.log("🏆 Winner:", winner ? winner._id : "NONE");

//     if (!winner) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No eligible premium users";
//       await campaign.save();
//       return;
//     }

//     // ===============================
//     // 7️⃣ Save win + complete
//     // ===============================
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

//     if (prize) {
//       await notificationService.sendGiveawayWinnerNotification(
//         winner._id,
//         prize.title
//       );
//     }

//     console.log("✅ Giveaway completed! Winner:", winner._id);
//     console.log("📊 Total participants:", matchedUserIds.length);

//   } catch (error) {
//     console.error("❌ Giveaway worker FAILED:", error.message);
    
//     try {
//       const campaign = await GiveawayCampaign.findOne({ 
//         drawStatus: "PROCESSING" 
//       });
//       if (campaign) {
//         campaign.drawStatus = "PENDING";
//         campaign.failureReason = error.message;
//         await campaign.save();
//       }
//     } catch (resetErr) {
//       console.error("❌ Reset failed:", resetErr);
//     }
//   }
// };









// ============================================
// giveaway.worker.js
// ============================================
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
const User = require("../../modules/auth/auth.model");
const { Match } = require("../../modules/matches/swipe/swipe.model"); // ✅ Destructured
const notificationService = require("../../modules/notifications/notification.service");
const Prize = require("../../modules/giveaway/prize.model");
const GiveawaySettings = require("../../modules/giveaway/giveawaySettings.model");

dayjs.extend(utc);
dayjs.extend(timezone);

const AEST_TZ = "Australia/Sydney"; 

module.exports = async function runGiveawayWorker() {
  console.log("🎯 Giveaway worker started at:", new Date().toISOString());

  try {
    // ===============================
    // 1️⃣ Find today's campaign
    // ===============================
    const nowAEST = dayjs().tz(AEST_TZ);
    const currentYear = nowAEST.year();

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const startOfTodayAEST = nowAEST.startOf("day").toDate();
    const endOfTodayAEST = nowAEST.endOf("day").toDate();

    console.log("📅 Now AEST:", nowAEST.format("YYYY-MM-DD HH:mm:ss"));

    const settings = await GiveawaySettings.findOne();
    const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

    const campaign = await GiveawayCampaign.findOne({
      $or: [
        { date: todayUTC },
        { date: { $gte: startOfTodayAEST, $lt: endOfTodayAEST } }
      ],
      isActive: true,
      drawStatus: "PENDING"
    });

    if (!campaign) {
      console.log("ℹ️ No pending giveaway campaign today");
      return;
    }

    console.log("✅ Campaign found:", campaign._id);

    // ===============================
    // 2️⃣ Lock campaign
    // ===============================
    campaign.drawStatus = "PROCESSING";
    await campaign.save();

    // ===============================
    // 3️⃣ Match window = YESTERDAY 00:00 - 23:59 AEST
    //    (Draw is NEXT DAY at 7PM)
    // ===============================
    const yesterdayAEST = nowAEST.subtract(1, "day");
    const giveawayStart = yesterdayAEST.startOf("day").toDate();
    const giveawayEnd = yesterdayAEST.endOf("day").toDate();

    console.log("🎰 Giveaway window (YESTERDAY AEST):");
    console.log("   From:", giveawayStart);
    console.log("   To:  ", giveawayEnd);

    // ===============================
    // 4️⃣ All matched users in window
    // ===============================
    const matchedUsers = await Match.aggregate([
      {
        $match: {
          matchedAt: { $gte: giveawayStart, $lte: giveawayEnd }
        }
      },
      { $unwind: "$users" },
      { $group: { _id: "$users" } }
    ]);

    console.log("👥 Total matched users:", matchedUsers.length);

    if (!matchedUsers.length) {
      campaign.drawStatus = "COMPLETED";
      campaign.failureReason = "No matches in giveaway window";
      campaign.matchWindowStart = giveawayStart;
      campaign.matchWindowEnd = giveawayEnd;
      campaign.participants = [];
      campaign.totalParticipants = 0;
      await campaign.save();
      return;
    }

    const matchedUserIds = matchedUsers.map(u => u._id);

    // ===============================
    // 5️⃣ Save participants
    // ===============================
    campaign.participants = matchedUserIds;
    campaign.totalParticipants = matchedUserIds.length;
    campaign.matchWindowStart = giveawayStart;
    campaign.matchWindowEnd = giveawayEnd;
    await campaign.save();

    console.log("📋 Participants saved:", matchedUserIds.length);

    // ===============================
    // 6️⃣ Pick winner
    //    - Must have match in window ✅
    //    - Must be Premium at DRAW TIME ✅
    //    - Must not have won 2+ times this year ✅
    //    - Random selection ✅
    // ===============================
    const [winner] = await User.aggregate([
      {
        $match: {
          _id: { $in: matchedUserIds },
          isPremium: true,
          accountStatus: "active",
          premiumExpiresAt: { $gt: new Date() } // Premium at DRAW time
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

    console.log("🏆 Winner:", winner ? winner._id : "NONE");

    if (!winner) {
      campaign.drawStatus = "COMPLETED";
      campaign.failureReason = "No eligible premium users";
      await campaign.save();
      return;
    }

    // ===============================
    // 7️⃣ Save win + complete
    // ===============================
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

    if (prize) {
      await notificationService.sendGiveawayWinnerNotification(
        winner._id,
        prize.title
      );
    }

    console.log("✅ Giveaway completed!");
    console.log("🏆 Winner:", winner._id);
    console.log("📊 Participants:", matchedUserIds.length);

  } catch (error) {
    console.error("❌ Giveaway worker FAILED:", error.message);

    try {
      const campaign = await GiveawayCampaign.findOne({
        drawStatus: "PROCESSING"
      });
      if (campaign) {
        campaign.drawStatus = "PENDING";
        campaign.failureReason = error.message;
        await campaign.save();
      }
    } catch (resetErr) {
      console.error("❌ Reset failed:", resetErr);
    }
  }
};