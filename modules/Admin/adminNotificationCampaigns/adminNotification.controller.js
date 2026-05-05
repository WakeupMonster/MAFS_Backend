const User = require("../../../modules/auth/auth.model");
const AdminNotificationCampaign = require("./admin.notification.model");
const notificationService = require("../../../modules/notifications/notification.service");
const NotificationLog = require("./notificationLog.model");
const { addAdminPushJob } = require("../../../queues/adminPush.queue");
const mongoose = require("mongoose");

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
      limit = 10,
      campaignId,
      userId,
      type, // 'email' | 'push'
      status, // 'sent' | 'failed' | 'delivered'
      fromDate,
      toDate,
      search,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const matchQuery = {};

    // 1. Basic Filters
    if (campaignId)
      matchQuery.campaignId = new mongoose.Types.ObjectId(campaignId);
    if (userId) matchQuery.userId = new mongoose.Types.ObjectId(userId);

    // Channel / Type Filter
    if (type && type !== "all") {
      matchQuery.type = type;
    }

    // Status Filter
    if (status && status !== "all") {
      // Map 'delivered' to 'sent' if backend only stores 'sent'
      if (status === "delivered") {
        matchQuery.status = "sent";
      } else {
        matchQuery.status = status;
      }
    }

    // Date Range Filter
    if (fromDate || toDate) {
      matchQuery.sentAt = {};
      if (fromDate) matchQuery.sentAt.$gte = new Date(fromDate);
      if (toDate) matchQuery.sentAt.$lte = new Date(toDate);
    }

    // Search by title or message
    if (search) {
      matchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      { $match: matchQuery },
      { $sort: { sentAt: -1 } },

      // Lookup User Details
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // Lookup Campaign Details
      {
        $lookup: {
          from: "adminnotificationcampaigns",
          localField: "campaignId",
          foreignField: "_id",
          as: "campaignDetails",
        },
      },
      {
        $unwind: { path: "$campaignDetails", preserveNullAndEmptyArrays: true },
      },

      // Project final fields
      {
        $project: {
          _id: 1,
          title: 1,
          message: 1,
          type: 1,
          status: 1,
          cta: 1,
          sentAt: 1,
          createdAt: 1,
          user: {
            phone: "$userDetails.phone",
            email: "$userDetails.email",
          },
          campaignName: "$campaignDetails.campaignName",
          target: "$campaignDetails.target",
        },
      },

      // Pagination Facet
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limitNum }],
        },
      },
    ];

    const result = await NotificationLog.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    return res.json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data,
    });
  } catch (err) {
    console.error("❌ Notification history aggregation error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification history",
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
