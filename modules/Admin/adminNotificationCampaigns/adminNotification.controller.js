const User = require("../../../modules/auth/auth.model");
const AdminNotificationCampaign = require("./admin.notification.model");
const AdminEmailCampaign = require("./adminEmailCampaign.model");
const notificationService = require("../../../modules/notifications/notification.service");
const NotificationLog = require("./notificationLog.model");
const { addAdminPushJob } = require("../../../queues/adminPush.queue");
const mongoose = require("mongoose");
const sendEmail = require("../../../common/notification/email.service");
const EmailLog = require("./emailLog.model");
const { adminDirectNotificationEmailTemplate } = require("../../../common/utils/adminDirectNotificationEmailTemplate");

module.exports.sendNotificationToPremiumUsers = async (req, res) => {
  try {
    const adminId = req.user._id;

    const {
      campaignName,
      title,
      message,
      cta,
      sendNow = true,
      scheduleAt = null,
    } = req.body;

    if (!campaignName || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "campaignName, title and message are required",
      });
    }

    // 1️Create campaign record
    const campaign = await AdminNotificationCampaign.create({
      campaignName,
      title,
      message,
      cta: typeof cta === "string" ? undefined : cta,
      target: "premium",
      mode: "manual",
      scheduleAt: sendNow ? null : scheduleAt,
      status: sendNow ? "sent" : "scheduled",
      createdBy: adminId,
    });

    // 2If scheduled → worker handle karega
    if (!sendNow) {
      return res.json({
        success: true,
        message: "Notification scheduled successfully",
        campaignId: campaign._id,
      });
    }

    const totalTargeted = await User.countDocuments({
      isPremium: true,
      accountStatus: "active",
      "banDetails.isBanned": { $ne: true },
      isFake: { $ne: true },
    });

    if (totalTargeted === 0) {
      return res.json({
        success: true,
        message: "No premium users found to notify",
        sentCount: 0,
      });
    }

    res.json({
      success: true,
      message: "Notification queued for premium users",
      totalTargetedUsers: totalTargeted,
    });

    try {
      await addAdminPushJob("PREMIUM_BROADCAST", {
        campaignId: campaign._id.toString(),
      });
    } catch (err) {
      console.error("Queue to premium users failed:", err);
    }
  } catch (err) {
    console.error("Admin premium notification error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
    });
  }
};

module.exports.createPremiumExpiryCampaign = async (req, res) => {
  try {
    const adminId = req.user._id;
    const {
      campaignName,
      title,
      message,
      cta,
      daysBeforeExpiry,
      auto = true,
    } = req.body;

    if (!campaignName || !title || !message || !daysBeforeExpiry) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const campaign = await AdminNotificationCampaign.create({
      campaignName,
      title,
      message,
      cta: typeof cta === "string" ? undefined : cta,
      target: "premium_expiry",
      expiryRule: {
        daysBeforeExpiry,
        auto,
      },
      status: auto ? "pending" : "scheduled",
      createdBy: adminId,
    });

    return res.json({
      success: true,
      message: "Premium expiry campaign created",
      data: campaign,
    });
  } catch (err) {
    console.error("❌ createPremiumExpiryCampaign error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.sendPremiumExpiryNow = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await AdminNotificationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    if (campaign.target !== "premium_expiry") {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign target",
      });
    }

    if (campaign.mode !== "manual") {
      return res.status(400).json({
        success: false,
        message: "Only manual campaigns can be sent manually",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysBeforeExpiry = campaign.expiryRule?.daysBeforeExpiry;
    if (typeof daysBeforeExpiry !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry rule",
      });
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysBeforeExpiry);

    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const query = {
      isPremium: true,
      accountStatus: "active",
      premiumExpiresAt: { $gte: start, $lte: end },
      "banDetails.isBanned": { $ne: true },
      isFake: { $ne: true },
    };

    const totalTargeted = await User.countDocuments(query);

    if (totalTargeted === 0) {
      return res.json({
        success: true,
        message: "No users matching expiry criteria found",
        sentCount: 0,
      });
    }

    res.json({
      success: true,
      message: "Premium expiry reminder queued",
      targetedUsers: totalTargeted,
    });

    try {
      await addAdminPushJob("PREMIUM_EXPIRY", {
        campaignId: campaign._id.toString(),
        todayTimestamp: Date.now(),
      });
    } catch (err) {
      console.error("Queue premium expiry failed:", err);
    }
  } catch (err) {
    console.error("Manual premium expiry send error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send premium expiry reminder",
    });
  }
};

module.exports.broadcastNotification = async (req, res) => {
  try {
    const adminId = req.user._id;

    const {
      campaignName,
      title,
      message,
      target,
      cta,
      sendMode = "now",
    } = req.body;

    if (!campaignName || !title || !message || !target) {
      return res.status(400).json({
        success: false,
        message: "campaignName, title, message, target are required",
      });
    }

    if (!["all", "free", "premium", "ghosted"].includes(target)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target audience",
      });
    }

    const campaign = await AdminNotificationCampaign.create({
      campaignName,
      title,
      message,
      target,
      cta: typeof cta === "string" ? undefined : cta,
      mode: "manual",
      status: "sent",
      createdBy: adminId,
      lastRunAt: new Date(),
    });

    const userQuery = {
      accountStatus: "active",
      "banDetails.isBanned": { $ne: true },
      isFake: { $ne: true },
    };

    if (target === "premium") {
      userQuery.isPremium = true;
    }

    if (target === "free") {
      userQuery.isPremium = false;
    }

    if (target === "ghosted") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      userQuery.lastLoginAt = { $lt: thirtyDaysAgo };
    }

    const totalTargeted = await User.countDocuments(userQuery);

    if (totalTargeted === 0) {
      return res.json({
        success: true,
        message: "No users matched the criteria",
        sentCount: 0,
      });
    }

    res.json({
      success: true,
      message: "Notification queued successfully",
      totalTargetedUsers: totalTargeted,
    });

    try {
      await addAdminPushJob("ADMIN_BROADCAST", {
        campaignId: campaign._id.toString(),
      });
    } catch (err) {
      console.error("Queue broadcast push error:", err);
    }
  } catch (err) {
    console.error("❌ broadcastNotification error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
    });
  }
};

module.exports.getNotificationHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      channel, // 'push' or 'email'
      status,
      fromDate,
      toDate,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Filter for both models
    const pushQuery = {};
    const emailQuery = {};

    const statusVal = status?.toLowerCase();
    if (statusVal) {
      if (statusVal === "delivered") {
        pushQuery.status = { $in: ["sent", "completed"] };
        emailQuery.status = "completed";
      } else if (statusVal === "failed") {
        pushQuery.$or = [{ status: "failed" }, { failedCount: { $gt: 0 } }];
        emailQuery.$or = [{ status: "failed" }, { failedCount: { $gt: 0 } }];
      } else {
        pushQuery.status = statusVal;
        emailQuery.status = statusVal;
      }
    }

    console.log("DEBUG: Status filter:", status);
    console.log("DEBUG: Push Query:", JSON.stringify(pushQuery));
    console.log("DEBUG: Email Query:", JSON.stringify(emailQuery));

    if (fromDate || toDate) {
      const dateRange = {};
      if (fromDate) dateRange.$gte = new Date(fromDate);
      if (toDate) dateRange.$lte = new Date(toDate);
      pushQuery.createdAt = dateRange;
      emailQuery.createdAt = dateRange;
    }

    let combinedHistory = [];
    let totalCount = 0;

    if (channel === "push") {
      const [pushCamps, total] = await Promise.all([
        AdminNotificationCampaign.find(pushQuery).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        AdminNotificationCampaign.countDocuments(pushQuery)
      ]);
      combinedHistory = pushCamps.map(c => ({ ...c, channel: "push" }));
      totalCount = total;
    } else if (channel === "email") {
      const [emailCamps, total] = await Promise.all([
        AdminEmailCampaign.find(emailQuery).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        AdminEmailCampaign.countDocuments(emailQuery)
      ]);
      combinedHistory = emailCamps.map(c => ({ ...c, channel: "email", title: c.subject, message: c.body }));
      totalCount = total;
    } else {
      // Fetch both and merge
      const [pushCamps, emailCamps] = await Promise.all([
        AdminNotificationCampaign.find(pushQuery).sort({ createdAt: -1 }).limit(Number(limit) + skip).lean(),
        AdminEmailCampaign.find(emailQuery).sort({ createdAt: -1 }).limit(Number(limit) + skip).lean()
      ]);

      const merged = [
        ...pushCamps.map(c => ({ ...c, channel: "push" })),
        ...emailCamps.map(c => ({ ...c, channel: "email", title: c.subject, message: c.body }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      combinedHistory = merged.slice(skip, skip + Number(limit));
    }

    const [pushTotal, emailTotal] = await Promise.all([
      AdminNotificationCampaign.countDocuments(pushQuery),
      AdminEmailCampaign.countDocuments(emailQuery)
    ]);
    totalCount = pushTotal + emailTotal;

    return res.json({
      success: true,
      pagination: {
        total: totalCount,
        pushCount: pushTotal,
        emailCount: emailTotal,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
      data: combinedHistory,
    });
  } catch (err) {
    console.error("❌ Notification history aggregation error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch unified campaign history",
    });
  }
};

module.exports.updateNotificationSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("userId", userId);
    const { push, email, matches, messages, likes } = req.body;
    const update = {};

    if (push !== undefined) {
      update["notificationSettings.push"] = push;
    }

    if (email !== undefined) {
      update["notificationSettings.email"] = email;
    }

    if (matches !== undefined) {
      update["notificationSettings.matches"] = matches;
    }

    if (messages !== undefined) {
      update["notificationSettings.messages"] = messages;
    }

    if (likes !== undefined) {
      update["notificationSettings.likes"] = likes;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true },
    ).select("notificationSettings");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification settings updated",
      data: user.notificationSettings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.sendIndividualNotification = async (req, res) => {
  try {
    const { userId, title, message, channels, ctaLabel, ctaAction } = req.body;

    if (!userId || !title || !message || !channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userId, title, message, and channels are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const results = {};
    const errors = {};

    if (channels.includes("email")) {
      if (!user.email) {
        errors.email = "User has no email address";
      } else {
        try {
          const htmlContent = adminDirectNotificationEmailTemplate({ title, message });

          await sendEmail({
            to: user.email,
            subject: title,
            html: htmlContent
          });

          await EmailLog.create({
            userId: user._id,
            email: user.email,
            status: "sent"
          });
          results.email = "Sent successfully";
        } catch (err) {
          console.error("❌ Individual notification email sending failed:", err);
          errors.email = err.message;

          await EmailLog.create({
            userId: user._id,
            email: user.email,
            status: "failed",
            error: err.message
          });
        }
      }
    }

    if (channels.includes("push")) {
      try {
        const cta = ctaLabel && ctaAction ? { label: ctaLabel, action: ctaAction } : undefined;
        await notificationService.sendAdminNotification({
          userId: user._id,
          title,
          message,
          data: { cta },
          respectUserSettings: false
        });
        results.push = "Sent successfully";
      } catch (err) {
        console.error("❌ Individual notification push sending failed:", err);
        errors.push = err.message;
      }
    }

    const hasFailed = Object.keys(errors).length > 0;
    const hasSucceeded = Object.keys(results).length > 0;

    if (hasFailed && !hasSucceeded) {
      return res.status(500).json({
        success: false,
        message: "Failed to send notifications",
        errors
      });
    }

    // 📢 Send verification to ntfy.sh for the admin's testing/tracking
    if (hasSucceeded) {
      try {
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        await fetch("https://ntfy.sh/my-test-notifications", {
          method: "POST",
          body: `[User: ${user._id}]\n[Channels: ${Object.keys(results).join(", ")}]\n${message}`,
          headers: {
            "Title": `[Individual] ${title}`,
            "Priority": "high",
            "Tags": "loudspeaker,bell,envelope"
          }
        });
      } catch (ntfyErr) {
        console.error("Failed to send to ntfy:", ntfyErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Notification processing completed",
      results,
      errors: hasFailed ? errors : undefined
    });

  } catch (err) {
    console.error("❌ sendIndividualNotification error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
