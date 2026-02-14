const Subscription = require("../models/Subscription");
const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const iapConfig = require("../config/iap.config");
const { generateIdempotencyKey } = require("../utils/iap.helpers");
const logger = require("../utils/logger");
const Profile = require("../../profile/profile.model");

class SubscriptionService {



  async _syncProfile(subscription) {
    try {
      
    console.log("🔄 Syncing Profile for User:", subscription.userId); // Debug 1
      if (!subscription || !subscription.userId) {
         console.log("❌ Subscription or UserId missing"); // Debug 2
        return;
      }

      const profileUpdate = {
        "subscription.planId": subscription.planType || "free",
        "subscription.isActive": subscription.status === "ACTIVE" || subscription.status === "GRACE",
        "subscription.expiryDate": subscription.expiresAt,
        "subscription.isTrial": false, // Logic add kar sakte ho agar trial ho
      };

      // Agar expired/cancelled hai toh free pe set karo?
      // Optional: Depend karta hai business logic pe
      if (subscription.status === "EXPIRED" || subscription.status === "REVOKED") {
        profileUpdate["subscription.planId"] = "free";
        profileUpdate["subscription.isActive"] = false;
      }

       console.log("📝 Update Payload:", profileUpdate); // Debug 3

      await Profile.findOneAndUpdate(
        { userId: subscription.userId },
        { $set: profileUpdate }
      );

      logger.info("Profile subscription synced", { userId: subscription.userId });
    } catch (err) {
      logger.error("Profile sync failed:", err.message);
    }
  }


  
  async handlePurchase(data) {
    const orConditions = [];

    if (data.originalTransactionId) {
      orConditions.push({ originalTransactionId: data.originalTransactionId });
    }
    if (data.purchaseToken) {
      orConditions.push({ purchaseToken: data.purchaseToken });
    }

    let existing = null;
    if (orConditions.length > 0) {
      existing = await Subscription.findOne({ $or: orConditions });
    }

    if (existing) {
      existing.status = "ACTIVE";
      existing.expiresAt = new Date(data.expiresDate);
      existing.latestTransactionId = data.transactionId || existing.latestTransactionId;
      existing.previousStatus = existing.status;
      await existing.save();

       await this._syncProfile(existing); 

      logger.info("Subscription updated (existing)", {
        subscriptionId: existing._id,
        userId: data.userId,
      });

      return existing;
    }

    const product = iapConfig.getProductDetails(data.productId);

    const subscription = await Subscription.create({
      userId: data.userId,
      platform: data.platform,
      productId: data.productId,
      planType: product ? product.planType : "monthly",
      status: "ACTIVE",
      autoRenew: true,
      startedAt: new Date(data.purchaseDate || Date.now()),
      expiresAt: new Date(data.expiresDate),
      originalTransactionId: data.originalTransactionId || undefined,
      latestTransactionId: data.transactionId || undefined,
      purchaseToken: data.purchaseToken || undefined,
      orderId: data.orderId || undefined,
      environment: iapConfig.apple.environment || "sandbox",
    });

    await this._logTransaction({
      subscriptionId: subscription._id,
      userId: data.userId,
      platform: data.platform,
      transactionId: data.transactionId,
      purchaseToken: data.purchaseToken,
      productId: data.productId,
      eventType: "PURCHASE",
      amount: product ? product.price : 0,
      currency: product ? product.currency : "USD",
      occurredAt: new Date(data.purchaseDate || Date.now()),
    });

    logger.info("New subscription created", {
      subscriptionId: subscription._id,
      userId: data.userId,
      planType: subscription.planType,
    });

    await this._syncProfile(subscription);

    return subscription;
  }

  // ─── RENEW ───
  async handleRenew(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for renew", data);
      throw new Error("Subscription not found for renew");
    }

    const product = iapConfig.getProductDetails(sub.productId);

    sub.previousStatus = sub.status;
    sub.status = "ACTIVE";
    sub.expiresAt = new Date(data.expiresDate);
    sub.latestTransactionId = data.transactionId || sub.latestTransactionId;
    sub.autoRenew = true;
    sub.retryCount = 0;
    await sub.save();

    await this._logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      transactionId: data.transactionId,
      productId: sub.productId,
      eventType: "RENEW",
      amount: product ? product.price : 0,
      currency: product ? product.currency : "USD",
      occurredAt: new Date(),
    });

    logger.info("Subscription renewed", { subscriptionId: sub._id });
    return sub;
  }

  // ─── CANCEL ───
  async handleCancel(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for cancel", data);
      throw new Error("Subscription not found for cancel");
    }

    sub.previousStatus = sub.status;
    sub.autoRenew = false;
    sub.cancellationReason = data.cancellationReason || "USER_CANCELLED";
    sub.cancelledAt = new Date();
    await sub.save();

    await this._syncProfile(sub);

    await this._logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "CANCEL",
      occurredAt: new Date(),
    });

    logger.info("Subscription cancelled", { subscriptionId: sub._id });
    return sub;
  }

  // ─── GRACE PERIOD ───
  async handleGracePeriod(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for grace", data);
      throw new Error("Subscription not found for grace period");
    }

    sub.previousStatus = sub.status;
    sub.status = "GRACE";
    sub.gracePeriodEndsAt = data.gracePeriodEndsAt
      ? new Date(data.gracePeriodEndsAt)
      : new Date(Date.now() + 16 * 24 * 60 * 60 * 1000);
    sub.retryCount = (sub.retryCount || 0) + 1;
    await sub.save();

    await this._syncProfile(sub);

    await this._logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "GRACE_PERIOD",
      occurredAt: new Date(),
    });

    logger.info("Subscription in grace period", {
      subscriptionId: sub._id,
      retryCount: sub.retryCount,
    });
    return sub;
  }

  // ─── EXPIRE ───
  async handleExpire(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for expire", data);
      throw new Error("Subscription not found for expire");
    }

    sub.previousStatus = sub.status;
    sub.status = "EXPIRED";
    sub.autoRenew = false;
    await sub.save();
     await this._syncProfile(sub);

    await this._logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "EXPIRE",
      occurredAt: new Date(),
    });

    logger.info("Subscription expired", { subscriptionId: sub._id });
    return sub;
  }

  // ─── REFUND ───
  async handleRefund(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for refund", data);
      throw new Error("Subscription not found for refund");
    }

    const product = iapConfig.getProductDetails(sub.productId);

    sub.previousStatus = sub.status;
    sub.status = "REVOKED";
    sub.autoRenew = false;
    sub.cancellationReason = "REFUNDED";
    sub.cancelledAt = new Date();
    await sub.save();

    await this._logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "REFUND",
      amount: product ? product.price : 0,
      refundAmount: data.refundAmount || (product ? product.price : 0),
      refundReason: data.refundReason || "UNKNOWN",
      occurredAt: new Date(),
    });

    logger.info("Subscription refunded/revoked", { subscriptionId: sub._id });
    return sub;
  }

  // ─── PAUSE ───
  async handlePause(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for pause", data);
      throw new Error("Subscription not found for pause");
    }

    sub.previousStatus = sub.status;
    sub.status = "PAUSED";
    sub.pausedAt = new Date();
    sub.resumesAt = data.resumesAt ? new Date(data.resumesAt) : null;
    await sub.save();

    await this._logTransaction({
      subscriptionId: sub._id,
      userId: sub.userId,
      platform: sub.platform,
      productId: sub.productId,
      eventType: "PAUSE",
      occurredAt: new Date(),
    });

    logger.info("Subscription paused", { subscriptionId: sub._id });
    return sub;
  }

  // ─── CHECK ACCESS ───
  async checkAccess(userId) {
    const sub = await Subscription.findOne({
      userId: userId,
      status: { $in: ["ACTIVE", "GRACE"] },
      $or: [
        { expiresAt: { $gt: new Date() } },
        { status: "GRACE", gracePeriodEndsAt: { $gt: new Date() } },
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

  // ─── GET USER SUBSCRIPTION ───
  async getUserSubscription(userId) {
    return Subscription.findOne({ userId: userId }).sort({ createdAt: -1 });
  }

  // ─── GET TRANSACTION HISTORY ───
  async getTransactionHistory(userId, limit) {
    const safeLimit = limit || 50;
    return SubscriptionTransaction.find({ userId: userId })
      .sort({ occurredAt: -1 })
      .limit(safeLimit);
  }

  // ─── PRIVATE: Find subscription ───
  async _findSubscription(data) {
    if (data.originalTransactionId) {
      return Subscription.findOne({
        originalTransactionId: data.originalTransactionId,
      });
    }
    if (data.purchaseToken) {
      return Subscription.findOne({ purchaseToken: data.purchaseToken });
    }
    if (data.userId) {
      return Subscription.findOne({ userId: data.userId }).sort({ createdAt: -1 });
    }
    return null;
  }

  // ─── PRIVATE: Log transaction ───
  async _logTransaction(data) {
    const identifier = data.transactionId || data.purchaseToken || String(Date.now());
    const key = generateIdempotencyKey(data.platform, data.eventType, identifier);

    try {
      await SubscriptionTransaction.create({
        subscriptionId: data.subscriptionId,
        userId: data.userId,
        platform: data.platform,
        transactionId: data.transactionId || undefined,
        purchaseToken: data.purchaseToken || undefined,
        productId: data.productId,
        eventType: data.eventType,
        amount: data.amount,
        currency: data.currency,
        refundReason: data.refundReason,
        refundAmount: data.refundAmount,
        occurredAt: data.occurredAt || new Date(),
        idempotencyKey: key,
      });
    } catch (err) {
      if (err.code === 11000) {
        logger.warn("Duplicate transaction, skipping", { key: key });
        return;
      }
      throw err;
    }
  }
}

module.exports = new SubscriptionService();