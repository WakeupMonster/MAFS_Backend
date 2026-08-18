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
      const toExpire = await Subscription.find({
        status: "ACTIVE",
        autoRenew: false,
        expiresAt: { $lte: new Date() },
      })
        .select("userId")
        .lean();

      if (toExpire.length === 0) return;

      const result = await Subscription.updateMany(
        {
          status: "ACTIVE",
          autoRenew: false,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: "EXPIRED" } }
      );

      // Safe Sync: Bulk check active plans and bulk revoke
      const uniqueUserIds = [...new Set(toExpire.map(s => s.userId.toString()))];

      if (uniqueUserIds.length > 0) {
        try {
          const usersWithActivePlans = await Subscription.distinct("userId", {
            userId: { $in: uniqueUserIds },
            $or: [
              { status: { $in: ["ACTIVE", "CANCELLED"] }, expiresAt: { $gt: new Date() } },
              { status: "GRACE", isInGracePeriod: true },
              { isInBillingRetry: true }
            ]
          });

          const activeIdsStr = usersWithActivePlans.map(id => id.toString());
          const usersToRevoke = uniqueUserIds.filter(uid => !activeIdsStr.includes(uid));

          if (usersToRevoke.length > 0) {
            await User.updateMany(
              { _id: { $in: usersToRevoke } },
              { $set: { isPremium: false, premiumExpiresAt: null } }
            );
          }
        } catch (err) {
          logger.error("[CRON] Safe sync bulk error:", err.message);
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

      // v3 Sync: Bulk check active plans and bulk revoke
      const uniqueUserIds = [...new Set(toExpire.map(s => s.userId.toString()))];

      if (uniqueUserIds.length > 0) {
        try {
          const usersWithActivePlans = await Subscription.distinct("userId", {
            userId: { $in: uniqueUserIds },
            $or: [
              { status: { $in: ["ACTIVE", "CANCELLED"] }, expiresAt: { $gt: new Date() } },
              { status: "GRACE", isInGracePeriod: true },
              { isInBillingRetry: true }
            ]
          });

          const activeIdsStr = usersWithActivePlans.map(id => id.toString());
          const usersToRevoke = uniqueUserIds.filter(uid => !activeIdsStr.includes(uid));

          if (usersToRevoke.length > 0) {
            await User.updateMany(
              { _id: { $in: usersToRevoke } },
              { $set: { isPremium: false, premiumExpiresAt: null } }
            );
          }
        } catch (err) {
          logger.error("[CRON] Safe sync bulk error for CANCELLED:", err.message);
        }
      }

      logger.info(
        "[CRON] Expired CANCELLED subscriptions: " + result.modifiedCount
      );
    } catch (err) {
      logger.error("[CRON] Cancelled expire check error:", err.message);
    }
  });

  // ─── CRON 3: Expire subscriptions when GRACE PERIOD ends ───
  // Safety net: If Apple/Google webhook is missed, this ensures users
  // don't stay in GRACE status forever.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await Subscription.updateMany(
        {
          status: "GRACE",
          isInGracePeriod: true,
          gracePeriodEndsAt: { $lte: new Date() },
        },
        {
          $set: {
            status: "EXPIRED",
            isInGracePeriod: false,
            isInBillingRetry: true
          }
        }
      );
      if (result.modifiedCount > 0) {
        logger.info("[CRON] Grace Period safety expiry triggered for: " + result.modifiedCount);
      }
    } catch (err) {
      logger.error("[CRON] Grace period check error:", err.message);
    }
  });

  // ─── CRON 4: Failed webhook events monitor ───
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

  // ─── CRON 5: Expire ACTIVE (autoRenew: true) subscriptions if webhook is missing ───
  // Runs every 1 hour. Gives a 72-hour buffer for Apple/Google webhooks to arrive.
  cron.schedule("0 * * * *", async () => {
    try {
      const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
      
      const toExpire = await Subscription.find({
        status: "ACTIVE",
        autoRenew: true,
        expiresAt: { $lte: cutoffDate },
      }).select("userId").lean();

      if (toExpire.length === 0) return;

      const result = await Subscription.updateMany(
        {
          status: "ACTIVE",
          autoRenew: true,
          expiresAt: { $lte: cutoffDate },
        },
        { $set: { status: "EXPIRED", isInBillingRetry: false } }
      );

      // Safe Sync: Bulk check active plans and bulk revoke (CRON 5)
      const uniqueUserIds = [...new Set(toExpire.map(s => s.userId.toString()))];

      if (uniqueUserIds.length > 0) {
        try {
          const usersWithActivePlans = await Subscription.distinct("userId", {
            userId: { $in: uniqueUserIds },
            $or: [
              { status: { $in: ["ACTIVE", "CANCELLED"] }, expiresAt: { $gt: new Date() } },
              { status: "GRACE", isInGracePeriod: true },
              { isInBillingRetry: true }
            ]
          });

          const activeIdsStr = usersWithActivePlans.map(id => id.toString());
          const usersToRevoke = uniqueUserIds.filter(uid => !activeIdsStr.includes(uid));

          if (usersToRevoke.length > 0) {
            await User.updateMany(
              { _id: { $in: usersToRevoke } },
              { $set: { isPremium: false, premiumExpiresAt: null } }
            );
          }
        } catch (err) {
          logger.error("[CRON] Safe sync bulk error (CRON 5):", err.message);
        }
      }

      logger.info(
        "[CRON] Expired stuck ACTIVE (autoRenew: true) subscriptions: " + result.modifiedCount
      );
    } catch (err) {
      logger.error("[CRON] AutoRenew fallback check error:", err.message);
    }
  });

  logger.info(
    "[CRON] Subscription cron jobs initialized (v3 - Grace Period & Billing Retry Support)"
  );
};

module.exports = { initCronJobs };