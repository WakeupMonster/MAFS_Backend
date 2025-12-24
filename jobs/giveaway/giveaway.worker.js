// const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
// const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
// const User = require("../../modules/auth/auth.model");

// module.exports = async function runGiveawayJob() {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   /**
//    * ======================================
//    * 1️⃣ Find today's PENDING campaign
//    * ======================================
//    */
//   const campaign = await GiveawayCampaign.findOne({
//     date: today,
//     isActive: true,
//     drawStatus: "PENDING"
//   });

//   if (!campaign) {
//     console.log("❌ No pending campaign for today");
//     return;
//   }

//   /**
//    * ======================================
//    * 2️⃣ Lock campaign (CRASH SAFE)
//    * ======================================
//    */
//   campaign.drawStatus = "PROCESSING";
//   await campaign.save();

//   try {
//     /**
//      * ======================================
//      * 3️⃣ Find eligible premium users
//      * ======================================
//      */
//     const eligibleUsers = await User.find({
//       isPremium: true,
//       accountStatus: "active"
//     }).select("_id");

//     if (!eligibleUsers.length) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "No premium users found";
//       await campaign.save();
//       return;
//     }

//     /**
//      * ======================================
//      * 4️⃣ Filter users by yearly win limit
//      * Max 2 wins per year
//      * ======================================
//      */
//     const currentYear = new Date().getFullYear();
//     const eligibleUserIds = [];

//     for (const user of eligibleUsers) {
//       const winCount = await GiveawayWinHistory.countDocuments({
//         userId: user._id,
//         year: currentYear
//       });

//       if (winCount < 2) {
//         eligibleUserIds.push(user._id);
//       }
//     }

//     if (!eligibleUserIds.length) {
//       campaign.drawStatus = "COMPLETED";
//       campaign.failureReason = "All users exceeded yearly win limit";
//       await campaign.save();
//       return;
//     }

//     /**
//      * ======================================
//      * 5️⃣ RANDOM SELECTION
//      * ======================================
//      */
//     const randomIndex = Math.floor(Math.random() * eligibleUserIds.length);
//     const winnerUserId = eligibleUserIds[randomIndex];

//     /**
//      * ======================================
//      * 6️⃣ Save win history (DB-level safety)
//      * ======================================
//      */
//     await GiveawayWinHistory.create({
//       userId: winnerUserId,
//       campaignId: campaign._id,
//       prizeId: campaign.prizeId,
//       year: currentYear
//     });

//     /**
//      * ======================================
//      * 7️⃣ Update campaign
//      * ======================================
//      */
//     campaign.winnerUserId = winnerUserId;
//     campaign.drawStatus = "COMPLETED";
//     campaign.drawAt = new Date();
//     await campaign.save();

//     console.log("✅ Giveaway completed successfully");

//   } catch (error) {
//     console.error("❌ Giveaway cron failed:", error);

//     /**
//      * ======================================
//      * 8️⃣ FAILURE HANDLING
//      * ======================================
//      */
//     campaign.drawStatus = "PENDING";
//     campaign.failureReason = error.message;
//     await campaign.save();
//   }
// };





const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
const User = require("../../modules/auth/auth.model");
const notificationService = require("../../modules/notifications/notification.service");
const Prize = require("../../modules/giveaway/prize.model");



module.exports = async function runGiveawayWorker() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  


  /**
   * ======================================
   * 1️⃣ Fetch today's pending campaign
   * ======================================
   */
  const campaign = await GiveawayCampaign.findOne({
    date: today,
    isActive: true,
    drawStatus: "PENDING"
  });

  if (!campaign) {
    console.log("ℹ️ No pending giveaway campaign today");
    return;
  }

  /**
   * ======================================
   * 2️⃣ Lock campaign (crash-safe)
   * ======================================
   */
  campaign.drawStatus = "PROCESSING";
  await campaign.save();

  try {
    /**
     * ======================================
     * 3️⃣ DB-LEVEL RANDOM WINNER SELECTION
     * Max 2 wins per year
     * ======================================
     */
    const currentYear = new Date().getFullYear();

    const [winner] = await User.aggregate([
      {
        $match: {
          isPremium: true,
          accountStatus: "active"
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
          $expr: {
            $lt: [{ $size: "$winsThisYear" }, 2]
          }
        }
      },
      {
        $sample: { size: 1 }
      },
      {
        $project: { _id: 1 }
      }
    ]);

    if (!winner) {
      campaign.drawStatus = "COMPLETED";
      campaign.failureReason = "No eligible users (yearly limit reached)";
      await campaign.save();
      return;
    }

    /**
     * ======================================
     * 4️⃣ Save win history (DB-safe)
     * ======================================
     */
    await GiveawayWinHistory.create({
      userId: winner._id,
      campaignId: campaign._id,
      prizeId: campaign.prizeId,
      year: currentYear
    });

    const prize = await Prize.findById(campaign.prizeId).select("title");
    const winnerUserId = winner._id;

    

    /**
     * ======================================
     * 5️⃣ Finalize campaign
     * ======================================
     */
    campaign.winnerUserId = winner._id;
    campaign.drawStatus = "COMPLETED";
    campaign.drawAt = new Date();
    await campaign.save();


    await notificationService.sendGiveawayWinnerNotification(
  winnerUserId,
  prize.title
);

    console.log("✅ Giveaway completed successfully");

  } catch (error) {
    console.error("❌ Giveaway worker failed:", error);

    /**
     * ======================================
     * 6️⃣ Rollback to PENDING (retry safe)
     * ======================================
     */
    campaign.drawStatus = "PENDING";
    campaign.failureReason = error.message;
    await campaign.save();
  }
};