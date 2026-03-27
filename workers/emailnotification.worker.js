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
    const filter = { accountStatus: "active" };
    if (campaign.target === "premium") filter.isPremium = true;
    if (campaign.target === "free") filter.isPremium = false;

    const totalUsers = await User.countDocuments(filter);

    let lastId = null;
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

      // Update progress on the job for monitoring
      await job.updateProgress(
        Math.round(((totalSent + totalFailed) / totalUsers) * 100)
      );

      // Track lastId for cursor pagination
      lastId = users[users.length - 1]._id;
    }

    campaign.status = "completed";
    campaign.sentCount = totalSent;
    campaign.failedCount = totalFailed;
    campaign.totalUsers = totalUsers;
    await campaign.save();

    console.log(
      `✅ Email campaign ${campaignId} complete: ${totalSent} sent, ${totalFailed} failed out of ${totalUsers}`
    );
    return { sent: totalSent, failed: totalFailed, total: totalUsers };
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
    }).catch(() => {});
  }
});

worker.on("error", (err) => {
  console.error("Email worker error:", err);
});

module.exports = worker;