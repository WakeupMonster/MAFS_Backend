const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const UsageService = require("../services/usage.service");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const logger = require("../utils/logger");

const initCronJobs = () => {
  // ─── CRON 1: Expire ACTIVE subscriptions (autoRenew off + date passed) ───
  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      // Find subscriptions that need expiring BEFORE updating (for sync)
      const toExpire = await Subscription.find({
        status: "ACTIVE",
        autoRenew: false,
        expiresAt: { $lte: new Date() },
      })
        .select("userId")
        .lean();

      if (toExpire.length === 0) return;

      // Bulk update status to EXPIRED
      const result = await Subscription.updateMany(
        {
          status: "ACTIVE",
          autoRenew: false,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: "EXPIRED" } }
      );

      // v3 Sync: Update isPremium flags for all affected users
      // const userIds = toExpire.map(s => s.userId);
      // for (const uid of userIds) {
      //   UsageService._syncPremiumState(uid, false).catch(err =>
      //     logger.error("[CRON] Sync error for user:", uid, err.message)
      //   );
      // }


      // NAYA CODE: Safe Sync (Checks for other active plans before revoking premium)
      const uniqueUserIds = [...new Set(toExpire.map(s => s.userId.toString()))];

      for (const uid of uniqueUserIds) {
        try {
          const anyActiveSub = await Subscription.findOne({
            userId: uid,
            status: { $in: ["ACTIVE", "CANCELLED"] },
            expiresAt: { $gt: new Date() }
          });

          if (!anyActiveSub) {
            await UsageService._syncPremiumState(uid, false);
          }
        } catch (err) {
          logger.error("[CRON] Safe sync error for user:", uid, err.message);
        }
      }


      logger.info(
        "[CRON] Expired ACTIVE subscriptions: " + result.modifiedCount
      );
    } catch (err) {
      logger.error("[CRON] Expire check error:", err.message);
    }
  });

  // ─── CRON 2: Expire CANCELLED subscriptions (date passed) ───
  // v3: CANCELLED means auto-renew is off, but user still has access until expiresAt.
  // Once expiresAt passes, we move them to EXPIRED.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const toExpire = await Subscription.find({
        status: "CANCELLED",
        expiresAt: { $lte: new Date() },
      })
        .select("userId")
        .lean();

      if (toExpire.length === 0) return;

      const result = await Subscription.updateMany(
        {
          status: "CANCELLED",
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: "EXPIRED" } }
      );

      // v3 Sync: Update isPremium flags for all affected users
      const userIds = toExpire.map((s) => s.userId);
      for (const uid of userIds) {
        UsageService._syncPremiumState(uid, false).catch((err) =>
          logger.error("[CRON] Sync error for user:", uid, err.message)
        );
      }

      logger.info(
        "[CRON] Expired CANCELLED subscriptions: " + result.modifiedCount
      );
    } catch (err) {
      logger.error("[CRON] Cancelled expire check error:", err.message);
    }
  });

  // ─── CRON 3: Failed webhook events monitor ───
  // Runs every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      const failedCount = await SubscriptionEvent.countDocuments({
        processed: false,
        "error.retryCount": { $gte: 5 },
      });

      if (failedCount > 0) {
        logger.warn(
          "[CRON] " + failedCount + " permanently failed events need attention"
        );
      }
    } catch (err) {
      logger.error("[CRON] Failed events check error:", err.message);
    }
  });

  logger.info(
    "[CRON] Subscription cron jobs initialized (v3 - No Grace Period)"
  );
};

module.exports = { initCronJobs };
