const { Worker } = require("bullmq");
const AdminEmailCampaign = require("../modules/Admin/adminNotificationCampaigns/adminEmailCampaign.model");
const User = require("../modules/auth/auth.model");
const EmailLog = require("../modules/Admin/adminNotificationCampaigns/emailLog.model");
const sendEmail = require("../common/notification/email.service");

const BATCH_SIZE = 500; // SAFE

const worker = new Worker(
  "admin-email-queue",
  async (job) => {
    console.log("📨 Email worker started job:", job.id);
  const { campaignId } = job.data;

  const campaign = await AdminEmailCampaign.findById(campaignId);
  if (!campaign) return;

  campaign.status = "processing";
  await campaign.save();

  let filter = { accountStatus: "active" };
  const totalUsers = await User.countDocuments(filter);

  if (campaign.target === "premium") filter.isPremium = true;
  if (campaign.target === "free") filter.isPremium = false;

  let page = 0;
  let sent = 0;
  let failed = 0;

  while (true) {
    const users = await User.find(filter)
      .select("email")
      .skip(page * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .lean();

    if (users.length === 0) break;

    for (const user of users) {
      if (!user.email) {
        await EmailLog.create({
          userId: user._id,
          campaignId,
          status: "skipped",
          error: "No email"
        });
        continue;
      }

      try {
        await sendEmail({
          to: user.email,
          subject: campaign.subject,
          html: campaign.body
        });

        sent++;
        await EmailLog.create({
          userId: user._id,
          email: user.email,
          campaignId,
          status: "sent"
        });
      } catch (err) {
        failed++;
        await EmailLog.create({
          userId: user._id,
          email: user.email,
          campaignId,
          status: "failed",
          error: err.message
        });
      }
    }

    page++;
  }

  campaign.status = "completed";
  campaign.sentCount = sent;
  campaign.failedCount = failed;
  campaign.totalUsers = totalUsers;
  await campaign.save();

  return true;
},
  {
    connection: {
      host: "127.0.0.1",
      port: 6379
    }
  });

module.exports = worker;