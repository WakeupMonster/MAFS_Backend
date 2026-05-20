const { Worker } = require("bullmq");
const AdminEmailCampaign = require("../modules/Admin/adminNotificationCampaigns/adminEmailCampaign.model");
const User = require("../modules/auth/auth.model");
const EmailLog = require("../modules/Admin/adminNotificationCampaigns/emailLog.model");
const sendEmail = require("../common/notification/email.service");

const BATCH_SIZE = 500;
const CONCURRENCY = 10; // Send 10 emails in parallel per batch

/**
 * Process a batch of emails with controlled concurrency
 */
async function processBatch(users, campaign, campaignId) {
  const logs = [];
  let sent = 0;
  let failed = 0;

  // Process in chunks of CONCURRENCY for controlled parallelism
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const chunk = users.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map(async (user) => {
        if (!user.email) {
          logs.push({
            userId: user._id,
            campaignId,
            status: "skipped",
            error: "No email",
          });
          return "skipped";
        }

        try {
          await sendEmail({
            to: user.email,
            subject: campaign.subject,
            html: campaign.body,
          });
          logs.push({
            userId: user._id,
            email: user.email,
            campaignId,
            status: "sent",
          });
          return "sent";
        } catch (err) {
          logs.push({
            userId: user._id,
            email: user.email,
            campaignId,
            status: "failed",
            error: err.message,
          });
          return "failed";
        }
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        if (r.value === "sent") sent++;
        else if (r.value === "failed") failed++;
      } else {
        failed++;
      }
    });
  }

  // Batch insert all logs at once instead of individual creates
  if (logs.length > 0) {
    await EmailLog.insertMany(logs, { ordered: false }).catch((err) =>
      console.error("EmailLog batch insert error:", err.message)
    );
  }

  return { sent, failed };
}

const worker = new Worker(
  "admin-email-queue",
  async (job) => {
    console.log("📨 Email worker started job:", job.id);
    const { campaignId } = job.data;

    const campaign = await AdminEmailCampaign.findById(campaignId);
    if (!campaign) {
      console.error("Campaign not found:", campaignId);
      return;
    }

    campaign.status = "processing";
    await campaign.save();

    // Build filter FIRST, then count (so totalUsers is accurate)
    // Exclude users without an email address to match sent+failed counts
    const filter = { accountStatus: "active", email: { $exists: true, $ne: "" }, $and: [{ email: { $ne: null } }] };
    if (campaign.target === "premium") filter.isPremium = true;
    if (campaign.target === "free") filter.isPremium = false;
    if (campaign.target === "ghosted") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.lastLoginAt = { $lt: thirtyDaysAgo };
    }

    const totalUsers = await User.countDocuments(filter);
    campaign.totalUsers = totalUsers;
    await campaign.save();

    let lastId = campaign.lastProcessedUserId || null;
    let totalSent = 0;
    let totalFailed = 0;


    // Cursor-based pagination using _id > lastId (O(1) per page instead of O(n) with skip)
    while (true) {
      const query = lastId ? { ...filter, _id: { $gt: lastId } } : filter;

      const users = await User.find(query)
        .sort({ _id: 1 })
        .select("_id email")
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) break;

      const { sent, failed } = await processBatch(users, campaign, campaignId);
      totalSent += sent;
      totalFailed += failed;

      const totalProcessedSoFar = (campaign.sentCount || 0) + (campaign.failedCount || 0) + totalSent + totalFailed;
      await job.updateProgress(
        Math.round((totalProcessedSoFar / totalUsers) * 100)
      );

      lastId = users[users.length - 1]._id;

      // Checkpoint progress to Database (Crash Resilience)
      campaign.lastProcessedUserId = lastId;
      campaign.sentCount = (campaign.sentCount || 0) + totalSent;
      campaign.failedCount = (campaign.failedCount || 0) + totalFailed;
      await campaign.save();

      // Reset local counts for next batch
      totalSent = 0;
      totalFailed = 0;
    }

    campaign.status = "completed";
    campaign.lastProcessedUserId = null;
    await campaign.save();

    console.log(
      `✅ Email campaign ${campaignId} complete: ${campaign.sentCount || 0} sent, ${campaign.failedCount || 0} failed out of ${totalUsers}`
    );
    return { sent: campaign.sentCount || 0, failed: campaign.failedCount || 0, total: totalUsers };
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
    },
    concurrency: 1, // Process one campaign at a time to avoid SMTP overload
  }
);

// Stale campaign recovery — if worker crashed mid-processing
worker.on("failed", async (job, err) => {
  console.error(`❌ Email worker job ${job?.id} failed:`, err.message);
  if (job?.data?.campaignId) {
    await AdminEmailCampaign.findByIdAndUpdate(job.data.campaignId, {
      status: "failed",
    }).catch(() => { });
  }
});

worker.on("error", (err) => {
  console.error("Email worker error:", err);
});

module.exports = worker;