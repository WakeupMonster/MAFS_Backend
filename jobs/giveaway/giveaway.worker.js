const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
const User = require("../../modules/auth/auth.model");
const {Match} = require("../../modules/matches/swipe/swipe.model");
const notificationService = require("../../modules/notifications/notification.service");
const Prize = require("../../modules/giveaway/prize.model");
const GiveawaySettings = require("../../modules/giveaway/giveawaySettings.model");

dayjs.extend(utc);
dayjs.extend(timezone);

const IST_TZ = "Asia/Kolkata";


module.exports = async function runGiveawayWorker() {
  console.log("🎯 Giveaway worker started at:", new Date().toISOString());

  try {
    // ===============================
    // 1️⃣ Find today's campaign
    // ===============================
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const startOfTodayIST = dayjs().tz(IST_TZ).startOf("day").toDate();
    const endOfTodayIST = dayjs().tz(IST_TZ).endOf("day").toDate();

    const settings = await GiveawaySettings.findOne();
    const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

    const campaign = await GiveawayCampaign.findOne({
      $or: [
        { date: todayUTC },
        { date: { $gte: startOfTodayIST, $lt: endOfTodayIST } }
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

    const nowIST = dayjs().tz(IST_TZ);
    const currentYear = nowIST.year();

    // ===============================
    // 3️⃣ Match window = TODAY (IST)
    // ===============================
    const giveawayStart = nowIST.startOf("day").toDate();
    const giveawayEnd = nowIST.endOf("day").toDate();

    console.log("🎰 Match window:", giveawayStart, "→", giveawayEnd);

    // ===============================
    // 4️⃣ ALL matched users in window
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
      await campaign.save();
      return;
    }

    const matchedUserIds = matchedUsers.map(u => u._id);

    // ===============================
    // ✅ 5️⃣ Save ALL participants in campaign
    // ===============================
    campaign.participants = matchedUserIds;
    campaign.totalParticipants = matchedUserIds.length;
    campaign.matchWindowStart = giveawayStart;
    campaign.matchWindowEnd = giveawayEnd;
    await campaign.save();

    console.log("📋 Participants saved:", matchedUserIds.length);

    // ===============================
    // 6️⃣ Pick winner (Premium + yearly limit)
    // ===============================
    const [winner] = await User.aggregate([
      {
        $match: {
          _id: { $in: matchedUserIds },
          isPremium: true,
          accountStatus: "active",
          // premiumExpiresAt: { $gt: new Date() }
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

    console.log("✅ Giveaway completed! Winner:", winner._id);
    console.log("📊 Total participants:", matchedUserIds.length);

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











// module.exports = async function runGiveawayWorker() {
//   console.log("🎯 Giveaway worker started at:", new Date().toISOString());

//   try {
//     const todayUTC = new Date();
//     todayUTC.setUTCHours(0, 0, 0, 0);

//     const tomorrowUTC = new Date(todayUTC);
//     tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

//     // IST range for today
//     const startOfTodayIST = dayjs().tz(IST_TZ).startOf("day").toDate();
//     const endOfTodayIST = dayjs().tz(IST_TZ).endOf("day").toDate();

//     console.log("📅 UTC today:", todayUTC);
//     console.log("📅 IST range:", startOfTodayIST, "→", endOfTodayIST);

//     const settings = await GiveawaySettings.findOne();
//     const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

//     // ✅ Search with $or - dono cases cover
//     const campaign = await GiveawayCampaign.findOne({
//       $or: [
//         { date: todayUTC },                                          // exact UTC midnight match
//         { date: { $gte: startOfTodayIST, $lt: endOfTodayIST } }    // IST range match
//       ],
//       isActive: true,
//       drawStatus: "PENDING"
//     });

//     // ✅ Debug logs
//     if (!campaign) {
//       console.log("ℹ️ No pending giveaway campaign today");

//       // Debug: show what's in DB
//       const allCampaigns = await GiveawayCampaign.find({
//         drawStatus: "PENDING",
//         isActive: true
//       }).select("date drawStatus isActive").limit(5);
//       console.log("📋 Pending campaigns in DB:", allCampaigns);

//       return;
//     }

//     console.log("✅ Campaign found:", campaign._id, "Date:", campaign.date);

//     /**
//      * ===============================
//      * 2️⃣ Lock campaign
//      * ===============================
//      */
//     campaign.drawStatus = "PROCESSING";
//     await campaign.save();
//     console.log("🔒 Campaign locked for processing");

//     const nowIST = dayjs().tz(IST_TZ);
//     const currentYear = nowIST.year();

// const giveawayStart = nowIST.startOf("day").toDate();
// const giveawayEnd = nowIST.endOf("day").toDate();

//     console.log("🎰 Match window:", giveawayStart, "→", giveawayEnd);

  
//     const matchedUsers = await Match.aggregate([
//       {
//         $match: {
//           matchedAt: { $gte: giveawayStart, $lte: giveawayEnd }
//         }
//       },
//       { $unwind: "$users" },
//       { $group: { _id: "$users" } }
//     ]);

//     console.log("👥 Matched users count:", matchedUsers.length);

//     if (!matchedUsers.length) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No matches in giveaway window";
//       await campaign.save();
//       console.log("⚠️ No matches found in window");
//       return;
//     }

//     const matchedUserIds = matchedUsers.map(u => u._id);

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

//     console.log("🏆 Winner:", winner ? winner._id : "NONE FOUND");

//     if (!winner) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No eligible users after filters";
//       await campaign.save();
//       console.log("⚠️ No eligible winner found");
//       return;
//     }


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

//     console.log("✅ Giveaway completed! Winner:", winner._id);

//   } catch (error) {
//     console.error("❌ Giveaway worker FAILED:", error.message);
//     console.error(error.stack);

//     // Try to reset campaign
//     try {
//       const campaign = await GiveawayCampaign.findOne({ drawStatus: "PROCESSING" });
//       if (campaign) {
//         campaign.drawStatus = "PENDING";
//         campaign.failureReason = error.message;
//         await campaign.save();
//       }
//     } catch (resetErr) {
//       console.error("❌ Reset also failed:", resetErr);
//     }
//   }
// };