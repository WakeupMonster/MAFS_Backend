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

const AEST_TZ = "Australia/Sydney";

/**
 * Main Worker Function
 */
module.exports = async function runGiveawayWorker() {
  console.log(`[${new Date().toISOString()}] 🎯 Giveaway worker initiated.`);

  try {
    const campaign = await findAndLockPendingCampaign();
    if (!campaign) {
      console.log("ℹ️ No pending giveaway campaign found for today.");
      return;
    }

    const { start, end } = getMatchWindow(campaign.date);
    const participantIds = await getMatchedUserIds(start, end);

    if (participantIds.length === 0) {
      await finalizeCampaign(campaign, {
        status: "COMPLETED",
        reason: "No matches in giveaway window",
        participants: [],
      });
      return;
    }

    // Update campaign with participant data before drawing
    campaign.participants = participantIds;
    campaign.totalParticipants = participantIds.length;
    campaign.matchWindowStart = start;
    campaign.matchWindowEnd = end;
    await campaign.save();

    const settings = await GiveawaySettings.findOne();
    const winner = await pickEligibleWinner(
      participantIds,
      settings?.yearlyWinLimitPerUser || 2
    );

    if (!winner) {
      await finalizeCampaign(campaign, {
        status: "COMPLETED",
        reason: "No eligible premium users",
      });
      return;
    }

    await recordWinAndNotify(campaign, winner);
    console.log(`✅ Giveaway finished. Winner: ${winner._id}`);
  } catch (error) {
    console.error("❌ Giveaway worker FAILED:", error.message);
    await rollbackProcessingCampaign(error.message);
  }
};

// --- Helper Functions ---

/**
 * Finds a PENDING campaign for today and moves it to PROCESSING atomically
 */
async function findAndLockPendingCampaign() {
  const nowAEST = dayjs().tz(AEST_TZ);
  const startOfDay = nowAEST.startOf("day").toDate();
  const endOfDay = nowAEST.endOf("day").toDate();

  return await GiveawayCampaign.findOneAndUpdate(
    {
      date: { $gte: startOfDay, $lte: endOfDay },
      isActive: true,
      drawStatus: "PENDING",
    },
    { drawStatus: "PROCESSING" },
    { new: true }
  );
}

/**
 * Calculates the 24h window for matches (Yesterday AEST)
 */
function getMatchWindow(campaignDate) {
  const baseDate = dayjs(campaignDate).tz(AEST_TZ);
  return {
    start: baseDate.startOf("day").toDate(),
    end: baseDate.endOf("day").toDate(),
  };
}

/**
 * Gets unique user IDs who had a match within the window
 */
async function getMatchedUserIds(start, end) {
  const matches = await Match.aggregate([
    { $match: { matchedAt: { $gte: start, $lte: end } } },
    { $unwind: "$users" },
    { $group: { _id: "$users" } },
  ]);
  return matches.map((m) => m._id);
}

/**
 * Complex aggregation to find a random eligible winner
 */
async function pickEligibleWinner(userIds, yearlyLimit) {
  const currentYear = dayjs().tz(AEST_TZ).year();

  const [winner] = await User.aggregate([
    {
      $match: {
        _id: { $in: userIds },
        isPremium: true,
        accountStatus: "active",
        premiumExpiresAt: { $gt: new Date() },
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
        as: "wins",
      },
    },
    { $match: { $expr: { $lt: [{ $size: "$wins" }, yearlyLimit] } } },
    { $sample: { size: 1 } },
    { $project: { _id: 1 } },
  ]);

  return winner;
}

/**
 * Handles the final DB updates, history creation, and push notifications
 */
async function recordWinAndNotify(campaign, winner) {
  const currentYear = dayjs().tz(AEST_TZ).year();

  await GiveawayWinHistory.create({
    userId: winner._id,
    campaignId: campaign._id,
    prizeId: campaign.prizeId,
    year: currentYear,
  });

  campaign.winnerUserId = winner._id;
  campaign.drawStatus = "COMPLETED";
  campaign.drawAt = new Date();
  await campaign.save();

  const prize = await Prize.findById(campaign.prizeId).select("title");
  if (prize) {
    await notificationService.sendGiveawayWinnerNotification(
      winner._id,
      prize.title
    );
  }
}

async function finalizeCampaign(campaign, { status, reason, participants }) {
  campaign.drawStatus = status;
  if (reason) campaign.failureReason = reason;
  if (participants) {
    campaign.participants = participants;
    campaign.totalParticipants = participants.length;
  }
  await campaign.save();
}

async function rollbackProcessingCampaign(errorMessage) {
  await GiveawayCampaign.updateOne(
    { drawStatus: "PROCESSING" },
    { drawStatus: "PENDING", failureReason: errorMessage }
  );
}
