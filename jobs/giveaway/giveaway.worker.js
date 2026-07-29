/* eslint-disable no-unused-vars */
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const GiveawayCampaign = require("../../modules/Admin/giveaways/giveawayCampaign.model");
const GiveawayWinHistory = require("../../modules/Admin/giveaways/giveawayWinHistory.model");
const User = require("../../modules/auth/auth.model");
const { Match } = require("../../modules/matches/swipe/swipe.model");
const notificationService = require("../../modules/notifications/notification.service");
const Prize = require("../../modules/Admin/giveaways/prize.model");
const GiveawaySettings = require("../../modules/Admin/giveaways/giveawaySettings.model");

dayjs.extend(utc);
dayjs.extend(timezone);

const CURRENT_TZ = (process.env.GIVEAWAY_TIMEZONE || "Australia/Sydney").replace(/^"|"$/g, '');
const IST_TZ = "Asia/Kolkata";

module.exports = async function runGiveawayWorker() {
  console.log("🎯 Giveaway worker started at:", new Date().toISOString());

  try {
    // ===============================
    // 1️⃣ Find today's campaign
    // ===============================
    const startOfTodayTZ = dayjs().tz(CURRENT_TZ).startOf("day").toDate();
    const endOfTodayTZ = dayjs().tz(CURRENT_TZ).endOf("day").toDate();

    const settings = await GiveawaySettings.findOne();
    const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

    // [COMMENTED OUT] Old query - picked ANY old pending campaign, not just current week
    // This caused issues when stale campaigns from previous weeks remained PENDING
    // const campaign = await GiveawayCampaign.findOne({
    //   date: { $lte: endOfTodayTZ },
    //   isActive: true,
    //   drawStatus: "PENDING",
    // }).sort({ date: 1 });

    // SELF-HEALING: Mark stale campaigns from previous weeks as COMPLETED
    const nowTZWorker = dayjs().tz(CURRENT_TZ);
    const nowDayWorker = nowTZWorker.day();
    const mondayOffset = nowDayWorker === 0 ? -6 : 1 - nowDayWorker;
    const currentWeekMonday = nowTZWorker.add(mondayOffset, "day").startOf("day").toDate();
    const currentWeekSunday = dayjs(currentWeekMonday).tz(CURRENT_TZ).add(6, "day").endOf("day").toDate();

    const staleResult = await GiveawayCampaign.updateMany(
      { drawStatus: "PENDING", isActive: true, date: { $lt: currentWeekMonday } },
      { $set: { drawStatus: "COMPLETED", failureReason: "Auto-skipped: Missed cron window from previous week" } }
    );
    if (staleResult.modifiedCount > 0) {
      console.log("Self-healed " + staleResult.modifiedCount + " stale pending campaign(s).");
    }

    // Strict current-week-only query (Monday-Sunday)
    const campaign = await GiveawayCampaign.findOne({
      date: { $gte: currentWeekMonday, $lte: currentWeekSunday },
      isActive: true,
      drawStatus: "PENDING",
    }).sort({ date: 1 });

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

    const nowTZ = dayjs().tz(CURRENT_TZ);
    const currentYear = nowTZ.year();

    // ===============================
    // 3️⃣ Match window (LAST COMPLETE Friday 00:00 → Thursday 23:59 AEST)
    // Client Rule: "Friday 00:00 to Thursday 23:59 (AEST/AEDT)"
    // ===============================
    // dayjs .day(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const currentDay = nowTZ.day();

    // Step A: Find the most recent COMPLETED Thursday (end of last full week)
    // If today is Friday(5): Thursday was 1 day ago ✅
    // If today is Thursday(4): go back 7 days to LAST Thursday (current week not done yet)
    const daysSinceThursday = (currentDay - 4 + 7) % 7 || 7;
    const lastThursday = nowTZ.subtract(daysSinceThursday, "day");

    // Step B: Friday is exactly 6 days before that Thursday
    const lastFriday = lastThursday.subtract(6, "day");

    // const giveawayStart = lastFriday.startOf("day").toDate();
    // const giveawayEnd = lastThursday.endOf("day").toDate();

    // console.log("🎰 Match window (AEST):", lastFriday.format("ddd DD-MMM"), "→", lastThursday.format("ddd DD-MMM"));
    // console.log("🎰 Match window (UTC):", giveawayStart, "→", giveawayEnd);



    const giveawayStart = nowTZ.subtract(7, "day").startOf("day").toDate();

    // END: Aaj raat 11:59 baje tak
    const giveawayEnd = nowTZ.endOf("day").toDate();
    console.log("🎰 [TESTING] Match window (AEST):", dayjs(giveawayStart).format("ddd DD-MMM"), "→", dayjs(giveawayEnd).format("ddd DD-MMM"));
    console.log("🎰 Match window (UTC):", giveawayStart, "→", giveawayEnd);


    // ===============================
    // 4️⃣ ALL matched users in window
    // ===============================
    const matchedUsers = await Match.aggregate([
      {
        $match: {
          matchedAt: { $gte: giveawayStart, $lte: giveawayEnd },
        },
      },
      { $unwind: "$users" },
      { $group: { _id: "$users" } },
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

    const matchedUserIds = matchedUsers.map((u) => u._id);

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
        },
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
                    { $eq: ["$year", currentYear] },
                  ],
                },
              },
            },
          ],
          as: "winsThisYear",
        },
      },
      {
        $match: {
          $expr: { $lt: [{ $size: "$winsThisYear" }, yearlyLimit] },
        },
      },
      { $sample: { size: 1 } },
      { $project: { _id: 1 } },
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
      year: currentYear,
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
        drawStatus: "PROCESSING",
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

// const dayjs = require("dayjs");
// const utc = require("dayjs/plugin/utc");
// const timezone = require("dayjs/plugin/timezone");

// const GiveawayCampaign = require("../../modules/Admin/giveaways/giveawayCampaign.model");
// const GiveawayWinHistory = require("../../modules/Admin/giveaways/giveawayWinHistory.model");
// const User = require("../../modules/auth/auth.model");
// const { Match } = require("../../modules/matches/swipe/swipe.model"); // ✅ Destructured
// const notificationService = require("../../modules/notifications/notification.service");
// const Prize = require("../../modules/Admin/giveaways/prize.model");
// const GiveawaySettings = require("../../modules/Admin/giveaways/giveawaySettings.model");

// dayjs.extend(utc);
// dayjs.extend(timezone);

// const AEST_TZ = "Australia/Sydney";

// module.exports = async function runGiveawayWorker() {
//   console.log("🎯 Giveaway worker started at:", new Date().toISOString());

//   try {
//     // ===============================
//     // 1️⃣ Find today's campaign
//     // ===============================
//     const nowAEST = dayjs().tz(AEST_TZ);
//     const currentYear = nowAEST.year();

//     const todayUTC = new Date();
//     todayUTC.setUTCHours(0, 0, 0, 0);

//     const startOfTodayAEST = nowAEST.startOf("day").toDate();
//     const endOfTodayAEST = nowAEST.endOf("day").toDate();

//     console.log("📅 Now AEST:", nowAEST.format("YYYY-MM-DD HH:mm:ss"));

//     const settings = await GiveawaySettings.findOne();
//     const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;

//     const campaign = await GiveawayCampaign.findOne({
//       $or: [
//         { date: todayUTC },
//         { date: { $gte: startOfTodayAEST, $lt: endOfTodayAEST } },
//       ],
//       isActive: true,
//       drawStatus: "PENDING",
//     });
//     const campaignDateAEST = dayjs(campaign.date).tz("Australia/Sydney");
//     console.log("campaignDateAEST:", campaignDateAEST);
//     const yesterdayAEST = nowAEST.subtract(1, "day");
//     console.log("yesterdayAEST :", yesterdayAEST);

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

//     // ===============================
//     // 3️⃣ Match window = YESTERDAY 00:00 - 23:59 AEST
//     //    (Draw is NEXT DAY at 7PM)
//     // ===============================

//     // const campaignDateAEST = dayjs(campaign.date).tz("Australia/Sydney");
//     // console.log("campaignDateAEST:", campaignDateAEST)
//     const giveawayStart = campaignDateAEST.startOf("day").toDate();
//     const giveawayEnd = campaignDateAEST.endOf("day").toDate();
//     // const yesterdayAEST = nowAEST.subtract(1, "day");
//     // console.log("yesterdayAEST :", yesterdayAEST)
//     // const giveawayStart = yesterdayAEST.startOf("day").toDate();
//     // const giveawayEnd = yesterdayAEST.endOf("day").toDate();

//     console.log("🎰 Giveaway window (YESTERDAY AEST):");
//     console.log("   From:", giveawayStart);
//     console.log("   To:  ", giveawayEnd);

//     // ===============================
//     // 4️⃣ All matched users in window
//     // ===============================
//     const matchedUsers = await Match.aggregate([
//       {
//         $match: {
//           matchedAt: { $gte: giveawayStart, $lte: giveawayEnd },
//         },
//       },
//       { $unwind: "$users" },
//       { $group: { _id: "$users" } },
//     ]);

//     console.log("👥 Total matched users:", matchedUsers.length);

//     if (!matchedUsers.length) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No matches in giveaway window";
//       campaign.matchWindowStart = giveawayStart;
//       campaign.matchWindowEnd = giveawayEnd;
//       campaign.participants = [];
//       campaign.totalParticipants = 0;
//       await campaign.save();
//       return;
//     }

//     const matchedUserIds = matchedUsers.map((u) => u._id);

//     // ===============================
//     // 5️⃣ Save participants
//     // ===============================
//     campaign.participants = matchedUserIds;
//     campaign.totalParticipants = matchedUserIds.length;
//     campaign.matchWindowStart = giveawayStart;
//     campaign.matchWindowEnd = giveawayEnd;
//     await campaign.save();

//     console.log("📋 Participants saved:", matchedUserIds.length);

//     // ===============================
//     // 6️⃣ Pick winner
//     //    - Must have match in window ✅
//     //    - Must be Premium at DRAW TIME ✅
//     //    - Must not have won 2+ times this year ✅
//     //    - Random selection ✅
//     // ===============================
//     const [winner] = await User.aggregate([
//       {
//         $match: {
//           _id: { $in: matchedUserIds },
//           isPremium: true,
//           accountStatus: "active",
//           premiumExpiresAt: { $gt: new Date() }, // Premium at DRAW time
//         },
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
//                     { $eq: ["$year", currentYear] },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "winsThisYear",
//         },
//       },
//       {
//         $match: {
//           $expr: { $lt: [{ $size: "$winsThisYear" }, yearlyLimit] },
//         },
//       },
//       { $sample: { size: 1 } },
//       { $project: { _id: 1 } },
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
//       year: currentYear,
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

//     console.log("✅ Giveaway completed!");
//     console.log("🏆 Winner:", winner._id);
//     console.log("📊 Participants:", matchedUserIds.length);
//   } catch (error) {
//     console.error("❌ Giveaway worker FAILED:", error.message);

//     try {
//       const campaign = await GiveawayCampaign.findOne({
//         drawStatus: "PROCESSING",
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