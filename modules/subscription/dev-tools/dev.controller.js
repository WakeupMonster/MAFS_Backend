/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DEV-ONLY TOOLS — Subscription Testing Utilities            ║
 * ║  ⚠️  These endpoints are ONLY available in development.     ║
 * ║  They are NOT registered in production/staging environments.║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Purpose: Allow frontend developers to reset a user's subscription
 * state so they can re-test the purchase flow without waiting for
 * expiry or manually editing the database.
 */

const Subscription = require("../models/Subscription");
const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const UserConsumableBalance = require("../models_v3/UserConsumableBalance");
const Profile = require("../../profile/profile.model");
const logger = require("../utils/logger");

/**
 * POST /api/v1/dev/subscription/reset
 *
 * Resets a user's subscription back to FREE.
 * Frontend dev hits this API → user becomes free → can re-test purchases.
 *
 * Body: { userId: "optional — if not provided, uses logged-in user" }
 * Auth: Bearer token required (uses the user's own token)
 */
const resetUserToFree = async (req, res, next) => {
  try {
    // Use provided userId or fall back to logged-in user
    const userId = req.body?.userId || req.user?._id;

    logger.info("🧪 [DEV] Resetting user to FREE", { userId });

    // 1. Delete all subscriptions and their events for a 100% clean slate
    const SubscriptionEvent = require("../models/SubscriptionEvent");
    await SubscriptionEvent.deleteMany({ subscriptionId: { $in: await Subscription.find({ userId }).distinct("_id") } });
    const subResult = await Subscription.deleteMany({ userId });

    // 2. Reset Profile subscription fields
    await Profile.findOneAndUpdate(
      { userId },
      {
        $set: {
          "subscription.planId": "free",
          "subscription.isActive": false,
          "subscription.expiryDate": null,
          "subscription.isTrial": false,
        },
      }
    );

    // 3. Reset consumable wallet (boosts, super keens back to 0)
    await UserConsumableBalance.findOneAndUpdate(
      { userId },
      { $set: { superKeensBalance: 0, boostsBalance: 0 } }
    );

    // 4. Clear ALL test transactions for this user (DEV only — safe to wipe)
    const txnResult = await SubscriptionTransaction.deleteMany({ userId });

    return res.json({
      success: true,
      message: "User reset to FREE successfully. Ready for re-testing.",
      data: {
        userId,
        subscriptionsExpired: subResult.modifiedCount,
        testTransactionsCleared: txnResult.deletedCount,
        profileReset: true,
        walletReset: true,
      },
    });
  } catch (err) {
    logger.error("🧪 [DEV] Reset failed:", err.message);
    return next(err);
  }
};

/**
 * GET /api/v1/dev/subscription/debug/:userId
 *
 * Returns full debug info for a user — helpful for frontend dev
 * to check current state without opening MongoDB.
 */
const debugUserState = async (req, res, next) => {
  try {
    const userId = req.params?.userId || req.user?._id;

    const [subscription, profile, wallet, recentTxns] = await Promise.all([
      Subscription.findOne({ userId }).sort({ createdAt: -1 }).lean(),
      Profile.findOne({ userId }).select("subscription nickname").lean(),
      UserConsumableBalance.findOne({ userId }).lean(),
      SubscriptionTransaction.find({ userId })
        .sort({ occurredAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.json({
      success: true,
      message: "Debug info fetched",
      data: {
        subscription: subscription
          ? {
            status: subscription.status,
            planType: subscription.planType,
            productId: subscription.productId,
            platform: subscription.platform,
            expiresAt: subscription.expiresAt,
            autoRenew: subscription.autoRenew,
            environment: subscription.environment,
          }
          : null,
        profile: profile
          ? {
            nickname: profile.nickname,
            subscriptionState: profile.subscription,
          }
          : null,
        wallet: wallet
          ? {
            superKeens: wallet.superKeensBalance,
            boosts: wallet.boostsBalance,
          }
          : { superKeens: 0, boosts: 0 },
        recentTransactions: recentTxns.map((t) => ({
          type: t.eventType,
          productId: t.productId,
          amount: t.amount,
          date: t.occurredAt,
          environment: t.environment,
        })),
      },
    });
  } catch (err) {
    logger.error("🧪 [DEV] Debug fetch failed:", err.message);
    return next(err);
  }
};

module.exports = { resetUserToFree, debugUserState };
