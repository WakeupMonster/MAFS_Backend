const { Worker } = require("bullmq");
const AdminNotificationCampaign = require("../modules/Admin/adminNotificationCampaigns/admin.notification.model");
const User = require("../modules/auth/auth.model");
const notificationService = require("../modules/notifications/notification.service");
const { connection } = require("../queues/bull");

const BATCH_SIZE = 500;

const worker = new Worker(
  "admin-push-queue",
  async (job) => {
    console.log(`🚀 Admin Push Worker started job: ${job.name} (ID: ${job.id})`);
    const { campaignId, todayTimestamp } = job.data;

    const campaign = await AdminNotificationCampaign.findById(campaignId);
    if (!campaign) {
      console.error("Campaign not found:", campaignId);
      return;
    }

    campaign.status = "processing";
    await campaign.save();

    let query = {
      accountStatus: "active",
      "banDetails.isBanned": { $ne: true },
    };

    if (campaign.target === "premium" || campaign.target === "premium_expiry") {
      query.isPremium = true;
    } else if (campaign.target === "free") {
      query.isPremium = false;
    }

    if (campaign.target === "premium_expiry") {
      const today = todayTimestamp ? new Date(todayTimestamp) : new Date();
      today.setHours(0, 0, 0, 0);

      const daysBeforeExpiry = campaign.expiryRule?.daysBeforeExpiry || 0;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysBeforeExpiry);

      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);

      query.premiumExpiresAt = { $gte: start, $lte: end };
    }

    const totalTargeted = await User.countDocuments(query);
    if (totalTargeted === 0) {
      campaign.status = "completed";
      campaign.lastRunAt = new Date();
      await campaign.save();
      return { sent: 0, failed: 0, total: 0 };
    }

    let lastId = campaign.lastProcessedUserId || null;
    let sentCount = 0;
    let failedCount = 0;

    while (true) {
      const cursorQuery = lastId ? { ...query, _id: { $gt: lastId } } : query;
      const users = await User.find(cursorQuery)
        .sort({ _id: 1 })
        .select("_id premiumExpiresAt")
        .limit(BATCH_SIZE)
        .lean();

        if (users.length === 0) break;

      for (const user of users) {
        let title = campaign.title;
        let message = campaign.message;
        let typeInfo = job.name;
        let daysLeft = undefined;

        if (campaign.target === "premium_expiry") {
            daysLeft = Math.max(
                0,
                Math.ceil(
                    (user.premiumExpiresAt - new Date()) / (1000 * 60 * 60 * 24)
                )
            );
            message = campaign.message.replace("{{daysLeft}}", daysLeft);
        }

        try {
          await notificationService.sendAdminNotification({
            userId: user._id,
            title,
            message,
            respectUserSettings: true,
            data: {
              type: typeInfo,
              campaignId: campaign._id.toString(),
              cta: campaign.cta,
              ...(daysLeft !== undefined && { daysLeft }),
            },
          });
          sentCount++;
        } catch (e) {
          failedCount++;
          console.error(`Failed to send ${typeInfo} to user:`, user._id);
        }
      }
      
     const totalProcessedSoFar = (campaign.sentCount || 0) + (campaign.failedCount || 0) + sentCount + failedCount;
      await job.updateProgress(
        Math.round((totalProcessedSoFar / totalTargeted) * 100)
      );

      lastId = users[users.length - 1]._id;

      // Checkpoint progress to Database (Crash Resilience)
      campaign.lastProcessedUserId = lastId;
      campaign.sentCount = (campaign.sentCount || 0) + sentCount;
      campaign.failedCount = (campaign.failedCount || 0) + failedCount;
      await campaign.save();
      
      // Reset batch counters
      sentCount = 0;
      failedCount = 0;
    }

    campaign.status = "completed";
    campaign.lastRunAt = new Date();
    // Clear cursor because the campaign finished successfully
    campaign.lastProcessedUserId = null;
    await campaign.save();

    console.log(
      `✅ Admin Push campaign ${campaignId} complete: ${campaign.sentCount || 0} sent, ${campaign.failedCount || 0} failed out of ${totalTargeted}`
    );
    return { sent: campaign.sentCount || 0, failed: campaign.failedCount || 0, total: totalTargeted };
  },
  {
    connection,
    concurrency: 2, 
  }
);

worker.on("failed", async (job, err) => {
  console.error(`❌ Admin Push worker job ${job?.id} failed:`, err.message);
  if (job?.data?.campaignId) {
    await AdminNotificationCampaign.findByIdAndUpdate(job.data.campaignId, {
      status: "failed",
    }).catch(() => {});
  }
});

worker.on("error", (err) => {
  console.error("Admin Push worker error:", err);
});

module.exports = worker;
