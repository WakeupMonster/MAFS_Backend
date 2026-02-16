const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const logger = require("../utils/logger");

const initCronJobs = () => {
  // Har 5 min: Expired subscriptions
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await Subscription.updateMany(
        {
          status: "ACTIVE",
          autoRenew: false,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: "EXPIRED" } }
      );

      if (result.modifiedCount > 0) {
        logger.info("[CRON] Expired subscriptions: " + result.modifiedCount);
      }
    } catch (err) {
      logger.error("[CRON] Expire check error:", err.message);
    }
  });

  // Har 5 min: Grace period expired
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await Subscription.updateMany(
        {
          status: "GRACE",
          gracePeriodEndsAt: { $lte: new Date() },
        },
        { $set: { status: "EXPIRED", autoRenew: false } }
      );

      if (result.modifiedCount > 0) {
        logger.info("[CRON] Grace expired: " + result.modifiedCount);
      }
    } catch (err) {
      logger.error("[CRON] Grace check error:", err.message);
    }
  });

  // Har 10 min: Failed events count
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

  logger.info("[CRON] Subscription cron jobs initialized");
};

module.exports = { initCronJobs };
