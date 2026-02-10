const Subscription = require("../models/Subscription");
const SubscriptionTransaction = require("../models/subscription_transactions");
const iapConfig = require("../config/iap.config");
const { generateIdempotencyKey } = require("../utils/iap.helpers");

class SubscriptionService {
  // ═══════════════════════════════
  //  PURCHASE
  // ═══════════════════════════════
  async handlePurchase(data) {
    // Pehle check - already exists?
    const existing = await Subscription.findOne({
      $or: [
        data.originalTransactionId
          ? { originalTransactionId: data.originalTransactionId }
          : { _id: null },
        data.purchaseToken
          ? { purchaseToken: data.purchaseToken }
          : { _id: null },
      ].filter((q) => !q._id),
    });

    if (existing) {
      existing.status = "ACTIVE";
      existing.expiresAt = new Date(data.expiresDate);
      existing.latestTransactionId =
        data.transactionId || existing.latestTransactionId;
      await existing.save();
      return existing;
    }

    // Product details
    const product = iapConfig.getProductDetails(data.productId);

    // Create subscription
    const subscription = await Subscription.create({
      userId: data.userId,
      platform: data.platform,
      productId: data.productId,
      planType: product?.planType || "monthly",
      status: "ACTIVE",
      autoRenew: true,
      startedAt: new Date(data.purchaseDate || Date.now()),
      expiresAt: new Date(data.expiresDate),
      originalTransactionId: data.originalTransactionId || null,
      latestTransactionId: data.transactionId || null,
      purchaseToken: data.purchaseToken || null,
      orderId: data.orderId || null,
      environment: data.environment || iapConfig.apple.environment,
    });

    // Transaction log
    await this.logTransaction({
      subscriptionId: subscription._id,
      userId: data.userId,
      platform: data.platform,
      transactionId: data.transactionId,
      purchaseToken: data.purchaseToken,
      productId: data.productId,
      eventType: "PURCHASE",
      amount: product?.price || 0,
      currency: product?.currency || "USD",
      occurredAt: new Date(data.purchaseDate || Date.now()),
    });

    return subscription;
  }

  // ═══════════════════════════════
  //  RENEW
  // ═══════════════════════════════
  async handleRenew(data) {
    const sub = await this.findSubscription(data);
    if (!sub) throw new Error("Subscription not found for renew");

    const product = iapConfig.getProductDetails(sub.productId);

    sub.status = "ACTIVE";
    sub.expiresAt = new Date(data.expiresDate);
    sub.latestTransactionId = data.transactionId || sub.latestTransactionId;
    sub.autoRenew = true;
    sub.retryCount = 0;
    sub.previousStatus = sub.status;
    await sub.save();

    await this.logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      transactionId: data.transactionId,
      productId: sub.productId,
      eventType: "RENEW",
      amount: product?.price || 0,
      currency: product?.currency || "USD",
      occurredAt: new Date(),
    });

    return sub;
  }

  // ═══════════════════════════════
  //  CANCEL
  // ═══════════════════════════════
  async handleCancel(data) {
    const sub = await this.findSubscription(data);
    if (!sub) throw new Error("Subscription not found for cancel");

    sub.autoRenew = false;
    sub.cancellationReason = data.cancellationReason || "USER_CANCELLED";
    sub.cancelledAt = new Date();
    // STATUS ACTIVE HI RAHEGA - period end tak access
    await sub.save();

    await this.logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "CANCEL",
      occurredAt: new Date(),
    });

    return sub;
  }

  // ═══════════════════════════════
  //  GRACE PERIOD
  // ═══════════════════════════════
  async handleGracePeriod(data) {
    const sub = await this.findSubscription(data);
    if (!sub) throw new Error("Subscription not found for grace");

    sub.status = "GRACE";
    sub.gracePeriodEndsAt = data.gracePeriodEndsAt
      ? new Date(data.gracePeriodEndsAt)
      : new Date(Date.now() + 16 * 24 * 60 * 60 * 1000); // 16 days
    sub.retryCount = (sub.retryCount || 0) + 1;
    await sub.save();

    await this.logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "GRACE_PERIOD",
      occurredAt: new Date(),
    });

    return sub;
  }

  // ═══════════════════════════════
  //  EXPIRE
  // ═══════════════════════════════
  async handleExpire(data) {
    const sub = await this.findSubscription(data);
    if (!sub) throw new Error("Subscription not found for expire");

    sub.status = "EXPIRED";
    sub.autoRenew = false;
    await sub.save();

    await this.logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "EXPIRE",
      occurredAt: new Date(),
    });

    return sub;
  }

  // ═══════════════════════════════
  //  REFUND
  // ═══════════════════════════════
  async handleRefund(data) {
    const sub = await this.findSubscription(data);
    if (!sub) throw new Error("Subscription not found for refund");

    const product = iapConfig.getProductDetails(sub.productId);

    sub.status = "REVOKED";
    sub.autoRenew = false;
    sub.cancellationReason = "REFUNDED";
    sub.cancelledAt = new Date();
    await sub.save();

    await this.logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "REFUND",
      amount: product?.price || 0,
      refundAmount: data.refundAmount || product?.price || 0,
      refundReason: data.refundReason || "UNKNOWN",
      occurredAt: new Date(),
    });

    return sub;
  }

  // ═══════════════════════════════
  //  PAUSE (Google only)
  // ═══════════════════════════════
  async handlePause(data) {
    const sub = await this.findSubscription(data);
    if (!sub) throw new Error("Subscription not found for pause");

    sub.status = "PAUSED";
    sub.pausedAt = new Date();
    sub.resumesAt = data.resumesAt ? new Date(data.resumesAt) : null;
    await sub.save();

    await this.logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "PAUSE",
      occurredAt: new Date(),
    });

    return sub;
  }

  // ═══════════════════════════════
  //  CHECK ACCESS
  // ═══════════════════════════════
  async checkAccess(userId) {
    const sub = await Subscription.findOne({
      userId,
      status: { $in: ["ACTIVE", "GRACE"] },
      $or: [
        { expiresAt: { $gt: new Date() } },
        {
          status: "GRACE",
          gracePeriodEndsAt: { $gt: new Date() },
        },
      ],
    });

    if (!sub) {
      return { isPremium: false, status: "NONE" };
    }

    return {
      isPremium: true,
      status: sub.status,
      planType: sub.planType,
      expiresAt: sub.expiresAt,
      autoRenew: sub.autoRenew,
      platform: sub.platform,
      productId: sub.productId,
    };
  }

  // ═══════════════════════════════
  //  GET USER SUBSCRIPTION
  // ═══════════════════════════════
  async getUserSubscription(userId) {
    return Subscription.findOne({ userId }).sort({ createdAt: -1 });
  }

  // ═══════════════════════════════
  //  GET TRANSACTION HISTORY
  // ═══════════════════════════════
  async getTransactionHistory(userId, limit = 50) {
    return SubscriptionTransaction.find({ userId })
      .sort({ occurredAt: -1 })
      .limit(limit);
  }

  // ═══════════════════════════════
  //  HELPERS
  // ═══════════════════════════════
  async findSubscription(data) {
    const query = [];

    if (data.originalTransactionId) {
      query.push({
        originalTransactionId: data.originalTransactionId,
      });
    }
    if (data.purchaseToken) {
      query.push({ purchaseToken: data.purchaseToken });
    }
    if (data.userId) {
      query.push({ userId: data.userId });
    }

    if (query.length === 0) return null;

    return Subscription.findOne(
      query.length === 1 ? query[0] : { $or: query }
    );
  }

  async logTransaction(data) {
    const identifier =
      data.transactionId || data.purchaseToken || Date.now();
    const key = generateIdempotencyKey(
      data.platform,
      data.eventType,
      identifier
    );

    try {
      await SubscriptionTransaction.create({
        ...data,
        occurredAt: data.occurredAt || new Date(),
        idempotencyKey: key,
      });
    } catch (err) {
      if (err.code === 11000) {
        console.log("Duplicate transaction, skipping");
        return;
      }
      throw err;
    }
  }
}

module.exports = new SubscriptionService();