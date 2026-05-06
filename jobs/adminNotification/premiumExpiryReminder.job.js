const AdminNotificationCampaign = require("../../modules/Admin/adminNotificationCampaigns/admin.notification.model");
const User = require("../../modules/auth/auth.model");
const notificationService = require("../../modules/notifications/notification.service");

module.exports = async function runPremiumExpiryReminderJob() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const campaigns = await AdminNotificationCampaign.find({
            target: "premium_expiry",
            mode: "auto",
            status: "pending"
        }).lean();

        for (const campaign of campaigns) {
            const { daysBeforeExpiry } = campaign.expiryRule || {};
            if (typeof daysBeforeExpiry !== "number") continue;

            // Duplicate protection (same day)
            if (
                campaign.lastRunAt &&
                new Date(campaign.lastRunAt).toDateString() === today.toDateString()
            ) {
                continue;
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
                "banDetails.isBanned": { $ne: true }
            };

            const BATCH_SIZE = 500;
            let lastId = null;
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
                    const daysLeft = Math.max(
                        0,
                        Math.ceil(
                            (user.premiumExpiresAt - new Date()) /
                            (1000 * 60 * 60 * 24)
                        )
                    );

                    const finalMessage = campaign.message.replace(
                        "{{daysLeft}}",
                        daysLeft
                    );

                    try {
                        await notificationService.sendAdminNotification({
                            userId: user._id,
                            title: campaign.title,
                            message: finalMessage,
                            respectUserSettings: true,
                            data: {
                                type: "PREMIUM_EXPIRY",
                                campaignId: campaign._id.toString(),
                                cta: campaign.cta,
                                daysLeft
                            }
                        });
                        sentCount++;
                    } catch (e) {
                        failedCount++;
                        console.error("Firebase push failed for expiry reminder user:", user._id);
                    }
                }

                lastId = users[users.length - 1]._id;
            }

            // Update campaign run info
            await AdminNotificationCampaign.findByIdAndUpdate(
                campaign._id,
                {
                    lastRunAt: new Date(),
                    $inc: { sentCount, failedCount }
                }
            );
        }

        console.log("✅ Premium expiry auto reminder job completed");
    } catch (err) {
        console.error("❌ Premium expiry reminder job failed:", err);
    }
};