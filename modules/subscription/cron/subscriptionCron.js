// cron/subscriptionCron.js
const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const SubscriptionEvent = require("../models/subscription_events");

function initCronJobs() {
  // ─── Har 5 min: Expired subscriptions ───
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
        console.log(`[CRON] Expired: ${result.modifiedCount} subscriptions`);
      }
    } catch (err) {
      console.error("[CRON] Expire check error:", err);
    }
  });

  // ─── Har 5 min: Grace period expired ───
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
        console.log(`[CRON] Grace expired: ${result.modifiedCount}`);
      }
    } catch (err) {
      console.error("[CRON] Grace check error:", err);
    }
  });

  // ─── Har 10 min: Retry failed events ───
  cron.schedule("*/10 * * * *", async () => {
    try {
      const failed = await SubscriptionEvent.find({
        processed: false,
        $or: [
          { error: { $exists: false } },
          { "error.retryCount": { $lt: 5 } },
        ],
        receivedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      }).limit(20);

      if (failed.length > 0) {
        console.log(`[CRON] ${failed.length} events to retry`);
        // TODO: Re-process these events
      }
    } catch (err) {
      console.error("[CRON] Retry error:", err);
    }
  });

  console.log("[CRON] Subscription cron jobs initialized ✅");
}

module.exports = { initCronJobs };
