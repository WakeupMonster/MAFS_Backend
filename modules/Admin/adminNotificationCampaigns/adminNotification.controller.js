/* eslint-disable no-unused-vars */
const User = require("../../../modules/auth/auth.model");
const AdminNotificationCampaign = require("./admin.notification.model");
const notificationService = require("../../../modules/notifications/notification.service");

exports.sendNotificationToPremiumUsers = async (req, res) => {
    try {
        const adminId = req.user._id;

        const {
            campaignName,
            title,
            message,
            cta,
            sendNow = true,
            scheduleAt = null
        } = req.body;

        if (!campaignName || !title || !message) {
            return res.status(400).json({
                success: false,
                message: "campaignName, title and message are required"
            });
        }

        // 1️Create campaign record
        const campaign = await AdminNotificationCampaign.create({
            campaignName,
            title,
            message,
            cta,
            target: "premium_users",
            mode: "manual",
            scheduleAt: sendNow ? null : scheduleAt,
            status: sendNow ? "sent" : "scheduled",
            createdBy: adminId
        });

        // 2If scheduled → worker handle karega
        if (!sendNow) {
            return res.json({
                success: true,
                message: "Notification scheduled successfully",
                campaignId: campaign._id
            });
        }

        // 3️Fetch premium users
        const premiumUsers = await User.find({
            isPremium: true,
            accountStatus: "active",
            "banDetails.isBanned": { $ne: true }
        }).select("_id").lean();

        // 4️Push notification jobs
        for (const user of premiumUsers) {
            await notificationService.sendAdminNotification({
                userId: user._id,
                title,
                message,
                respectUserSettings: true,
                data: {
                    type: "PREMIUM_BROADCAST",
                    campaignId: campaign._id,
                    cta
                }
            });

        }


        // 5️Update sent count
        await AdminNotificationCampaign.findByIdAndUpdate(
            campaign._id,
            { sentCount: premiumUsers.length }
        );

        return res.json({
            success: true,
            message: "Notification sent to premium users",
            sentCount: premiumUsers.length
        });

    } catch (err) {
        console.error("Admin premium notification error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to send notification"
        });
    }
};


exports.createPremiumExpiryCampaign = async (req, res) => {
    try {
        const adminId = req.user._id;
        const {
            campaignName,
            title,
            message,
            cta,
            daysBeforeExpiry,
            auto = true
        } = req.body;

        if (!campaignName || !title || !message || !daysBeforeExpiry) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const campaign = await AdminNotificationCampaign.create({
            campaignName,
            title,
            message,
            cta,
            target: "premium_expiry",
            expiryRule: {
                daysBeforeExpiry,
                auto
            },
            status: auto ? "pending" : "scheduled",
            createdBy: adminId
        });

        return res.json({
            success: true,
            message: "Premium expiry campaign created",
            data: campaign
        });

    } catch (err) {
  console.error("❌ createPremiumExpiryCampaign error:", err);
  return res.status(500).json({
    success: false,
    message: err.message
  });
}

};


exports.sendPremiumExpiryNow = async (req, res) => {
    try {
        const { campaignId } = req.params;

        const campaign = await AdminNotificationCampaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.target !== "premium_expiry") {
            return res.status(400).json({
                success: false,
                message: "Invalid campaign target"
            });
        }

        if (campaign.mode !== "manual") {
            return res.status(400).json({
                success: false,
                message: "Only manual campaigns can be sent manually"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysBeforeExpiry = campaign.expiryRule?.daysBeforeExpiry;
        if (typeof daysBeforeExpiry !== "number") {
            return res.status(400).json({
                success: false,
                message: "Invalid expiry rule"
            });
        }

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysBeforeExpiry);

        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        const users = await User.find({
            isPremium: true,
            accountStatus: "active",
            premiumExpiresAt: { $gte: start, $lte: end },
            "banDetails.isBanned": { $ne: true }
        })
            .select("_id premiumExpiresAt")
            .lean();


        let sentCount = 0;

        for (const user of users) {
            const daysLeft = Math.max(
                0,
                Math.ceil(
                    (user.account.premiumExpiry - new Date()) /
                    (1000 * 60 * 60 * 24)
                )
            );

            const finalMessage = campaign.message.replace(
                "{{daysLeft}}",
                daysLeft
            );
            await notificationService.sendAdminNotification({
                userId: user._id,
                title: campaign.title,
                message: finalMessage,
                respectUserSettings: true,
                data: {
                    type: "PREMIUM_EXPIRY",
                    campaignId: campaign._id,
                    cta: campaign.cta,
                    daysLeft
                }
            });


            //   await notificationService.add("admin_campaign", {
            //     userId: user._id,
            //     title: campaign.title,
            //     message: finalMessage,
            //     cta: campaign.cta,
            //     type: "PREMIUM_EXPIRY"
            //   });

            sentCount++;
        }

        campaign.status = "sent";
        campaign.lastRunAt = new Date();
        campaign.sentCount += sentCount;
        await campaign.save();

        return res.json({
            success: true,
            message: "Premium expiry reminder sent successfully",
            sentCount
        });
    } catch (err) {
        console.error("Manual premium expiry send error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to send premium expiry reminder"
        });
    }
};


exports.broadcastNotification = async (req, res) => {
    try {
        const adminId = req.user._id;

        const {
            campaignName,
            title,
            message,
            target,
            cta,
            sendMode = "now"
        } = req.body;


        if (!campaignName || !title || !message || !target) {
            return res.status(400).json({
                success: false,
                message: "campaignName, title, message, target are required"
            });
        }

        if (!["all_users", "free_users", "premium_users"].includes(target)) {
            return res.status(400).json({
                success: false,
                message: "Invalid target audience"
            });
        }


        const campaign = await AdminNotificationCampaign.create({
            campaignName,
            title,
            message,
            target,
            cta,
            mode: "manual",
            status: "sent",
            createdBy: adminId,
            lastRunAt: new Date()
        });


        const userQuery = {
            accountStatus: "active",
            "banDetails.isBanned": { $ne: true }
        };

        if (target === "premium_users") {
            userQuery.isPremium = true;
        }

        if (target === "free_users") {
            userQuery.isPremium = false;
        }

        const users = await User.find(userQuery).select("_id").lean();

        if (!users.length) {
            return res.json({
                success: true,
                message: "No users matched the criteria",
                sentCount: 0
            });
        }

        let sentCount = 0;

        // for (const user of users) {
        //   await notificationService.sendAdminNotification("admin_broadcast", {
        //     userId: user._id,
        //     title,
        //     message,
        //     cta,
        //     type: "ADMIN_BROADCAST",
        //     campaignId: campaign._id
        //   });

        //   sentCount++;
        // }

        for (const user of users) {
            console.log( user._id,"userId from broadcastNotification")
            await notificationService.sendAdminNotification({
                userId: user._id,
                title,
                message,
                respectUserSettings: true, // user settings ka respect
                data: {
                    type: "ADMIN_BROADCAST",
                    campaignId: campaign._id.toString(),
                    cta
                }
            });
          sentCount++;
        }

        campaign.sentCount = sentCount;
        await campaign.save();

        return res.json({
            success: true,
            message: "Notification sent successfully",
            sentCount
        });

    } catch (err) {
        console.error("❌ broadcastNotification error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to send notification"
        });
    }
};  

const NotificationLog = require("./notificationLog.model");

exports.getNotificationHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      campaignId,
      userId,
      type,
      status,
      fromDate,
      toDate
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

      NotificationLog.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("❌ Notification history error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification history"
    });
  }
};