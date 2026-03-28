/* eslint-disable no-unused-vars */
const User = require("../../../modules/auth/auth.model");
const AdminNotificationCampaign = require("./admin.notification.model");
const notificationService = require("../../../modules/notifications/notification.service");
const NotificationLog = require("./notificationLog.model");
const { addAdminPushJob } = require("../../../queues/adminPush.queue");

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

    if (!["all", "free", "premium"].includes(target)) {
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
    };

    if (target === "premium") {
      userQuery.isPremium = true;
    }

    if (target === "free") {
      userQuery.isPremium = false;
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
      limit = 20,
      campaignId,
      userId,
      type,
      status,
      fromDate,
      toDate,
    } = req.query;

    const query = {};

    if (campaignId) query.campaignId = campaignId;
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (status) query.status = status;

    if (fromDate || toDate) {
      query.sentAt = {};
      if (fromDate) query.sentAt.$gte = new Date(fromDate);
      if (toDate) query.sentAt.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      NotificationLog.find(query)
        .populate("userId", "phone email")
        .populate("campaignId", "campaignName target")
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      NotificationLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Notification history error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification history",
    });
  }
};
