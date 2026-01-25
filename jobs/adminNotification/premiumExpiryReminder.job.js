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
                        (user.premiumExpiresAt - new Date()) /
                        (1000 * 60 * 60 * 24)
                    )
                );

                const finalMessage = campaign.message.replace(
                    "{{daysLeft}}",
                    daysLeft
                );

                await notificationService.sendAdminNotification({
                    userId: user._id,
                    title : campaign.title,
                    message: finalMessage,
                    respectUserSettings: true,
                    data: {
                        type: "PREMIUM_BROADCAST",
                        campaignId: campaign._id,
                         cta: campaign.cta,
                    }
                });
                sentCount++;
            }

            // Update campaign run info
            await AdminNotificationCampaign.findByIdAndUpdate(
                campaign._id,
                {
                    lastRunAt: new Date(),
                    $inc: { sentCount }
                }
            );
        }

        console.log("✅ Premium expiry auto reminder job completed");
    } catch (err) {
        console.error("❌ Premium expiry reminder job failed:", err);
    }
};
