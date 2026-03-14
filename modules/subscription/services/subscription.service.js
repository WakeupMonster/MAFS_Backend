const Subscription = require("../models/Subscription");
const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const Product = require("../models_v3/Product");
const UserConsumableBalance = require("../models_v3/UserConsumableBalance");
const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const UsageService = require("./usage.service");
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

      const isActive = ["ACTIVE", "CANCELLED"].includes(subscription.status) && subscription.expiresAt > new Date();

      const profileUpdate = {
        "subscription.planId": subscription.planType || "free",
        "subscription.isActive": isActive,
        "subscription.expiryDate": subscription.expiresAt,
        "subscription.isTrial": false
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



  /**
   * v3 Purchase Router: Determines if the purchase is a SUBSCRIPTION or CONSUMABLE
   * and routes to the correct handler.
   */
  async handlePurchase(data) {
    // Step 1: Check our Product catalog (v3 dynamic store) first
    const catalogProduct = await Product.findOne({
      $or: [
        { appleProductId: data.productId },
        { googleProductId: data.productId },
        { productKey: data.productId }
      ],
      isActive: true
    }).lean();

    // Step 2: THE FORK — Route based on product type
    if (catalogProduct && catalogProduct.type === 'CONSUMABLE') {
      return this._handleConsumablePurchase(data, catalogProduct);
    }

    // Step 3: SUBSCRIPTION flow (original logic, unchanged)
    return this._handleSubscriptionPurchase(data);
  }

  /**
   * Handles Consumable purchases (Super Keens, Boosts packs).
   * Adds items directly to the user's Wallet (UserConsumableBalance).
   */
  async _handleConsumablePurchase(data, catalogProduct) {
    // Determine which wallet field to increment
    const incrementField = {};
    if (catalogProduct.consumableType === 'SUPER_KEEN') {
      incrementField.superKeensBalance = catalogProduct.quantity;
    } else if (catalogProduct.consumableType === 'BOOST') {
      incrementField.boostsBalance = catalogProduct.quantity;
    } else {
      throw new Error(`Unknown consumable type: ${catalogProduct.consumableType}`);
    }

    // Idempotency Check (Prevent duplicate consumable granting)
    const identifier = data.transactionId || data.purchaseToken || String(Date.now());
    const eventType = "CONSUMABLE_PURCHASE";
    const key = generateIdempotencyKey(data.platform, eventType, identifier);
    
    // Using exists instead of findOne for performance, since we only need the boolean representation
    const txnExists = await SubscriptionTransaction.exists({ idempotencyKey: key });
    if (txnExists) {
      logger.info("DOUBLE GRANT PREVENTED: Consumable already granted (Idempotency)", { key, userId: data.userId });
      return {
        type: 'CONSUMABLE',
        consumableType: catalogProduct.consumableType,
        quantity: catalogProduct.quantity,
        status: "ALREADY_GRANTED"
      };
    }

    // Atomic wallet update (upsert: creates wallet if first purchase)
    const updatedWallet = await UserConsumableBalance.findOneAndUpdate(
      { userId: data.userId },
      { $inc: incrementField },
      { upsert: true, new: true }
    );

    // Log the transaction for audit trail
    await this._logTransaction({
      userId: data.userId,
      platform: data.platform,
      transactionId: data.transactionId,
      purchaseToken: data.purchaseToken,
      productId: data.productId,
      eventType: "CONSUMABLE_PURCHASE",
      amount: parseFloat(String(catalogProduct.displayPrice).replace(/[^0-9.]/g, '')) || 0,
      currency: catalogProduct.currency || "AUD",
      occurredAt: new Date(data.purchaseDate || Date.now()),
    });

    logger.info("Consumable purchase processed", {
      userId: data.userId,
      type: catalogProduct.consumableType,
      quantity: catalogProduct.quantity,
      newBalance: updatedWallet
    });

    return {
      type: 'CONSUMABLE',
      consumableType: catalogProduct.consumableType,
      quantity: catalogProduct.quantity,
      // wallet: {
      //   superKeens: updatedWallet.superKeensBalance,
      //   boosts: updatedWallet.boostsBalance
      // }
    };
  }

  /**
   * Handles Subscription purchases (Premium Plans).
   * Creates or updates a Subscription record with expiresAt.
   */
  async _handleSubscriptionPurchase(data) {
    const orConditions = [];

    if (data.originalTransactionId) {
      orConditions.push({ originalTransactionId: data.originalTransactionId });
    }
    if (data.purchaseToken) {
      orConditions.push({ purchaseToken: data.purchaseToken });
    }

    // v3: Enhanced product lookup. Check DB Catalog first, fallback to config.
    const dbProduct = await Product.findOne({
      $or: [
        { appleProductId: data.productId },
        { googleProductId: data.productId }
      ]
    }).lean();

    const configProduct = iapConfig.getProductDetails(data.productId);
    const catalogPlanType = dbProduct ? dbProduct.planType : (configProduct ? configProduct.planType : "1_MONTH");

    let existing = null;
    if (orConditions.length > 0) {
      existing = await Subscription.findOne({ $or: orConditions });
    }

    if (existing) {
      existing.userId = data.userId; // Ensure subscription belongs to current user
      existing.status = "ACTIVE";
      existing.expiresAt = new Date(data.expiresDate);
      existing.latestTransactionId = data.transactionId || existing.latestTransactionId;
      existing.previousStatus = existing.status;
      existing.productId = data.productId; // Update the product ID in case of an upgrade/crossgrade
      existing.planType = catalogPlanType; // v3: Ensure consistent planType on update/verify
      await existing.save();

      // v3 Sync: Use UsageService for consistent premium state
      UsageService._syncPremiumState(existing.userId, true).catch(err => logger.error('Sync Error:', err));
      await this._syncProfile(existing);

      logger.info("Subscription updated (existing)", {
        subscriptionId: existing._id,
        userId: data.userId,
      });

      return { type: 'SUBSCRIPTION', subscription: existing };
    }

    const subscription = await Subscription.create({
      userId: data.userId,
      platform: data.platform,
      productId: data.productId,
      planType: catalogPlanType,
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

    const amount = dbProduct ? parseFloat(dbProduct.displayPrice.replace(/[^0-9.]/g, '')) : (configProduct ? configProduct.price : 0);
    const currency = dbProduct ? dbProduct.currency : (configProduct ? configProduct.currency : "AUD");

    await this._logTransaction({
      subscriptionId: subscription._id,
      userId: data.userId,
      platform: data.platform,
      transactionId: data.transactionId,
      purchaseToken: data.purchaseToken,
      productId: data.productId,
      eventType: "PURCHASE",
      amount: amount,
      currency: currency,
      occurredAt: new Date(data.purchaseDate || Date.now()),
    });

    logger.info("New subscription created", {
      subscriptionId: subscription._id,
      userId: data.userId,
      planType: subscription.planType,
    });

    // v3 Sync: Use UsageService for consistent premium state
    UsageService._syncPremiumState(subscription.userId, true).catch(err => logger.error('Sync Error:', err));
    await this._syncProfile(subscription);

    return { type: 'SUBSCRIPTION', subscription: subscription };
  }

  // ─── RENEW ───
  async handleRenew(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for renew", data);
      throw new Error("Subscription not found for renew");
    }

    // v3: Enhanced product lookup
    const dbProduct = await Product.findOne({
      $or: [
        { appleProductId: sub.productId },
        { googleProductId: sub.productId }
      ]
    }).lean();

    const configProduct = iapConfig.getProductDetails(sub.productId);
    const amount = dbProduct ? parseFloat(dbProduct.displayPrice.replace(/[^0-9.]/g, '')) : (configProduct ? configProduct.price : 0);
    const currency = dbProduct ? dbProduct.currency : (configProduct ? configProduct.currency : "AUD");

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
      amount: amount,
      currency: currency,
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
    // v3: No Grace Period. CANCELLED users still have access until expiresAt.
    const sub = await Subscription.findOne({
      userId: userId,
      status: { $in: ["ACTIVE", "CANCELLED"] },
      expiresAt: { $gt: new Date() },
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
    const [transactions, total] = await Promise.all([
      SubscriptionTransaction.find({ userId: userId })
        .sort({ occurredAt: -1 })
        .limit(safeLimit)
        .lean(),
      SubscriptionTransaction.countDocuments({ userId: userId })
    ]);
    return { transactions, total };
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
  /**
   * Milestone Grant: Automatically grants premium to the first X users.
   * Called during registration/onboarding.
   */
  async handleMilestoneGrant(userId) {
    try {
      const config = await SubscriptionConfig.getOrCreate();

      // 1. Is milestone active?
      if (!config.milestone || !config.milestone.isActive) return null;

      // 2. Already premium? Check if any subscription exists for this user
      const existingSub = await Subscription.findOne({ userId });
      if (existingSub) return null;

      // 3. User limit check
      const User = require("../../auth/auth.model");
      const userCount = await User.countDocuments({ isFake: false });

      if (userCount > config.milestone.targetUserCount) {
        // Auto-disable milestone if limit reached
        config.milestone.isActive = false;
        await config.save();
        logger.info("Milestone target reached, auto-disabled milestone grant.");
        return null;
      }

      // 4. Grant Premium (30 days)
      const duration = config.milestone.grantDurationDays || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      const subscription = await Subscription.create({
        userId,
        platform: "admin_granted",
        productId: "milestone_premium_v3",
        planType: "MILESTONE",
        status: "ACTIVE",
        autoRenew: false,
        startedAt: new Date(),
        expiresAt: expiresAt,
        grantReason: "milestone_first_1000",
        environment: "production"
      });

      // 5. Sync Premium State (User/Profile flags)
      await UsageService._syncPremiumState(userId, true);
      await this._syncProfile(subscription);

      logger.info(`Milestone premium granted to user ${userId} (Rank: ${userCount})`);
      return subscription;
    } catch (err) {
      logger.error("Milestone grant failed:", err.message);
      return null;
    }
  }
}

module.exports = new SubscriptionService();