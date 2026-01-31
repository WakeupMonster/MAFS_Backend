const GiveawayCampaign = require("../../modules/giveaway/giveawayCampaign.model");
const GiveawayWinHistory = require("../../modules/giveaway/giveawayWinHistory.model");
const User = require("../../modules/auth/auth.model");
const notificationService = require("../../modules/notifications/notification.service");
const Prize = require("../../modules/giveaway/prize.model");

module.exports = async function runGiveawayWorker() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

//   const settings = await GiveawaySettings.findOne();
// const yearlyLimit = settings?.yearlyWinLimitPerUser || 2;


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
    await GiveawayWinHistory.create({
      userId: winner._id,
      campaignId: campaign._id,
      prizeId: campaign.prizeId,
      year: currentYear
    });

    const prize = await Prize.findById(campaign.prizeId).select("title");
    const winnerUserId = winner._id;
    
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

    campaign.drawStatus = "PENDING";
    campaign.failureReason = error.message;
    await campaign.save();
  }
};