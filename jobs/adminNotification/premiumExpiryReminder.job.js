const AdminNotificationCampaign = require("../../modules/Admin/adminNotificationCampaigns/admin.notification.model");
const User = require("../../modules/auth/auth.model");
const Subscription = require("../../modules/subscription/models/Subscription");
const notificationService = require("../../modules/notifications/notification.service");
const { startOfDay, endOfDay, isSameAppDay } = require("../../common/utils/time");

module.exports = async function runPremiumExpiryReminderJob() {
    try {
        // Calendar-day boundary resolved against Australia/Sydney (APP_TZ),
        // not server-local/UTC time — see common/utils/time.js.
        const today = startOfDay();

        const campaigns = await AdminNotificationCampaign.find({
            target: "premium_expiry",
            mode: "auto",
            status: "pending"
        }).lean();

        for (const campaign of campaigns) {
            let stages = [];
            const rule = campaign.expiryRule || {};

            if (rule.dripStages && Array.isArray(rule.dripStages) && rule.dripStages.length > 0) {
                stages = rule.dripStages;
            } else if (typeof rule.daysBeforeExpiry === "number") {
                stages = [{ days: rule.daysBeforeExpiry }];
            }

            if (stages.length === 0) continue;

            // Duplicate protection (same day, Australia/Sydney calendar)
            if (
                campaign.lastRunAt &&
                isSameAppDay(campaign.lastRunAt, today)
            ) {
                continue;
            }

            let campaignSentCount = 0;
            let campaignFailedCount = 0;

            for (const stage of stages) {
                const targetDays = stage.days;
                if (typeof targetDays !== "number") continue;

                const stageKey = `stage_${targetDays}`;
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + targetDays);

                const start = startOfDay(targetDate);
                const end = endOfDay(targetDate);

                const subQuery = {
                    status: { $in: ["ACTIVE", "CANCELLED"] },
                    expiresAt: { $gte: start, $lte: end },
                    dripNotificationsSent: { $ne: stageKey } // Deduplication
                };

                const BATCH_SIZE = 500;
                let lastId = null;

            while (true) {
                const cursorQuery = lastId ? { ...subQuery, _id: { $gt: lastId } } : subQuery;

                const subscriptions = await Subscription.find(cursorQuery)
                    .sort({ _id: 1 })
                    .select("_id userId expiresAt autoRenew")
                    .limit(BATCH_SIZE)
                    .lean();

                if (subscriptions.length === 0) break;

                const userIds = subscriptions.map(sub => sub.userId);
                
                // Fetch valid users
                const users = await User.find({
                    _id: { $in: userIds },
                    accountStatus: "active",
                    "banDetails.isBanned": { $ne: true }
                }).select("_id").lean();

                const validUserIds = new Set(users.map(u => u._id.toString()));

                for (const sub of subscriptions) {
                    if (!validUserIds.has(sub.userId.toString())) continue;

                    const nowStart = startOfDay();
                    const expStart = startOfDay(sub.expiresAt);

                    const daysLeft = Math.max(
                        0,
                        Math.round((expStart - nowStart) / (1000 * 60 * 60 * 24))
                    );

                    let baseMessage = stage.customMessage || campaign.message;
                    
                    // Dynamic message enhancement if template is basic
                    if (!stage.customMessage && !baseMessage.includes("{{daysLeft}}")) {
                        if (sub.autoRenew) {
                            baseMessage = `${baseMessage} \nYour Premium renews in ${daysLeft} days.`;
                        } else {
                            baseMessage = `${baseMessage} \nYour Premium expires in ${daysLeft} days! Renew now.`;
                        }
                    }

                    const finalMessage = baseMessage.replace(
                        /{{daysLeft}}/g,
                        daysLeft
                    );

                    try {
                        await notificationService.sendAdminNotification({
                            userId: sub.userId,
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
                        campaignSentCount++;
                        
                        // Mark stage as sent to prevent duplicates
                        await Subscription.updateOne(
                            { _id: sub._id },
                            { $addToSet: { dripNotificationsSent: stageKey } }
                        );
                    } catch (e) {
                        campaignFailedCount++;
                        console.error("Firebase push failed for expiry reminder user:", sub.userId);
                    }
                }

                lastId = subscriptions[subscriptions.length - 1]._id;
            }
        } // End stages loop

        // Update campaign run info
        await AdminNotificationCampaign.findByIdAndUpdate(
            campaign._id,
            {
                lastRunAt: new Date(),
                $inc: { sentCount: campaignSentCount, failedCount: campaignFailedCount }
            }
        );
        }

        console.log("✅ Premium expiry auto reminder job completed");
    } catch (err) {
        console.error("❌ Premium expiry reminder job failed:", err);
    }
};