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
const adminEvents = require("../../../events/admin.events");

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

    const result = {
      type: 'CONSUMABLE',
      consumableType: catalogProduct.consumableType,
      quantity: catalogProduct.quantity,
    };

    // 📢 Fire real-time activity for Admin
    Profile.findOne({ userId: data.userId }).select('nickname').then(p => {
      adminEvents.emit("new_live_activity", {
        id: identifier,
        createdAt: new Date(),
        description: `Top-up: ${p?.nickname || "User"} (${catalogProduct.quantity} ${catalogProduct.consumableType === 'SUPER_KEEN' ? 'Super Keens' : 'Boosts'})`,
        color: "#FFB800"
      });
    }).catch(err => console.error("Admin consumable event emit failed", err));

    return result;
  }

  /**
   * Handles Subscription purchases (Premium Plans).
   * Creates or updates a Subscription record with expiresAt.
   */
  async _handleSubscriptionPurchase(data) {
    // v3: Enhanced product lookup. Check DB Catalog first, fallback to config.
    const dbProduct = await Product.findOne({
      $or: [
        { appleProductId: data.productId },
        { googleProductId: data.productId }
      ]
    }).lean();

    const configProduct = iapConfig.getProductDetails(data.productId);
    const catalogPlanType = dbProduct ? dbProduct.planType : (configProduct ? configProduct.planType : "1_MONTH");

    // Atomic Upsert: Keyed on originalTransactionId (iOS) or purchaseToken (Android)
    const filter = {};
    if (data.originalTransactionId) {
      filter.originalTransactionId = data.originalTransactionId;
    } else if (data.purchaseToken) {
      filter.purchaseToken = data.purchaseToken;
    } else {
      // Fallback to userId if no remote IDs (should not happen in real StoreKit)
      filter.userId = data.userId;
    }

    const update = {
      $set: {
        userId: data.userId,
        platform: data.platform,
        productId: data.productId,
        planType: catalogPlanType,
        status: "ACTIVE",
        autoRenew: true,
        startedAt: new Date(data.purchaseDate || Date.now()),
        expiresAt: new Date(data.expiresDate),
        latestTransactionId: data.transactionId || undefined,
        purchaseToken: data.purchaseToken || undefined,
        orderId: data.orderId || undefined,
        source: data.source || "STORE",
        environment: iapConfig.apple.environment || "sandbox",
        isInBillingRetry: false,
        isInGracePeriod: false,
        gracePeriodEndsAt: null,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date(),
        originalTransactionId: data.originalTransactionId || undefined,
      }
    };

    const subscription = await Subscription.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true
    });

    // v3 Sync: Update User/Profile flags
    await UsageService._syncPremiumState(subscription.userId, true).catch(err => logger.error('Sync Error:', err));
    await this._syncProfile(subscription);

    // Revenue Tracking: Log the transaction
    const amount = dbProduct ? parseFloat(String(dbProduct.displayPrice).replace(/[^0-9.]/g, '')) : (configProduct ? configProduct.price : 0);
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

    logger.info(subscription.isNew ? "New subscription created" : "Subscription updated", {
      subscriptionId: subscription._id,
      userId: data.userId,
    });

    // 📢 Admin Live Activity
    Profile.findOne({ userId: data.userId }).select('nickname').then(p => {
      adminEvents.emit("new_live_activity", {
        id: subscription._id,
        createdAt: new Date(),
        description: `Purchase: ${p?.nickname || "User"} (${catalogPlanType})`,
        color: "#FFB800"
      });
    }).catch(err => console.error("Admin sub event failed", err));

    return { type: 'SUBSCRIPTION', subscription };
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
    sub.isInBillingRetry = false;
    sub.isInGracePeriod = false;
    sub.gracePeriodEndsAt = null;
    await sub.save();

    await this._syncProfile(sub);
    const UsageService = require("./usage.service");
    await UsageService._syncPremiumState(sub.userId, true).catch(err => logger.error('Sync Error:', err));

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
    sub.status = "CANCELLED";
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

  // ─── RE-ACTIVATE (Un-cancel) ───
  async handleReActivate(data) {
    const sub = await this._findSubscription(data);
    if (!sub) {
      logger.error("Subscription not found for re-activate", data);
      throw new Error("Subscription not found for re-activate");
    }

    sub.previousStatus = sub.status;
    sub.status = "ACTIVE";
    sub.autoRenew = true;
    sub.cancellationReason = undefined;
    sub.cancelledAt = undefined;
    await sub.save();

    await this._syncProfile(sub);
    await UsageService._syncPremiumState(sub.userId, true).catch(err => logger.error('Sync Error:', err));

    logger.info("Subscription re-activated", { subscriptionId: sub._id });
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
    sub.isInBillingRetry = false;
    sub.isInGracePeriod = false;
    sub.gracePeriodEndsAt = null;
    await sub.save();
    await this._syncProfile(sub);

    const UsageService = require("./usage.service");
    await UsageService._syncPremiumState(sub.userId, false).catch(err => logger.error('Sync Error:', err));

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

  // ─── CONSUMABLE REFUND (WALLET SE WAPAS LENA) ───
  async handleConsumableRefund(data) {
    try {
      // // 1. Kis user ne ye purchase kiya tha? (Transaction table se nikalna)
      // const originalTx = await SubscriptionTransaction.findOne({
      //   purchaseToken: data.purchaseToken,
      //   eventType: "CONSUMABLE_PURCHASE"
      // });

      // 1. Kis user ne ye purchase kiya tha? (Transaction table se nikalna)
      const originalTx = await SubscriptionTransaction.findOne({
        $or: [
          { purchaseToken: data.purchaseToken },
          { transactionId: data.purchaseToken },      // Apple yaha catch hoga
          { transactionId: data.transactionId },      // iOS fallback
          { transactionId: data.originalTransactionId }
        ],
        eventType: "CONSUMABLE_PURCHASE"
      });


      if (!originalTx) {
        logger.error("Consumable refund ke liye purani transaction nahi mili", data);
        return;
      }

      // 2. Wo product (Boost/SuperKeen) kitne pack ka tha?
      const catalogProduct = await Product.findOne({
        $or: [
          { appleProductId: data.productId },
          { googleProductId: data.productId },
          { productKey: data.productId }
        ]
      }).lean();

      if (!catalogProduct) return;

      // 3. Deduction (Minus) Field tayar karna
      const decrementField = {};
      if (catalogProduct.consumableType === 'SUPER_KEEN') {
        decrementField.superKeensBalance = -catalogProduct.quantity; // Minus
      } else if (catalogProduct.consumableType === 'BOOST') {
        decrementField.boostsBalance = -catalogProduct.quantity; // Minus
      }

      // 4. User ke Wallet table se minus kar dena
      await UserConsumableBalance.findOneAndUpdate(
        { userId: originalTx.userId },
        { $inc: decrementField }
      );

      // Agar user ne kharch kar diye the, toh -ve me na jaye
      await UserConsumableBalance.updateMany(
        { userId: originalTx.userId, superKeensBalance: { $lt: 0 } },
        { $set: { superKeensBalance: 0 } }
      );
      await UserConsumableBalance.updateMany(
        { userId: originalTx.userId, boostsBalance: { $lt: 0 } },
        { $set: { boostsBalance: 0 } }
      );

      // 5. Fraud Log record kar lena (Record History)
      await this._logTransaction({
        userId: originalTx.userId,
        platform: data.platform,
        purchaseToken: data.purchaseToken,
        productId: data.productId,
        eventType: "CONSUMABLE_REFUND",
        refundReason: "GOOGLE_CANCELED",
      });

      logger.info(`Fraud Roka Gaya: ${catalogProduct.quantity} ${catalogProduct.consumableType} kam kiye gaye`, { userId: originalTx.userId });

    } catch (error) {
      logger.error("Consumable refund handle error:", error.message);
    }
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


  // ─── ADMIN GRANTED GIVEAWAY (SAFE ISOLATED CREATION) ───
  async handleGiveawayGrant(userId, durationInDays, planType, prizeTitle, prizeId) {
    console.log("prizeTitle function", prizeTitle)
    try {
      const daysToAdd = durationInDays || 30; // Fallback to 30 days

      // 1. Calculate the start date. 
      // Logically kicks in AFTER their current plan ends to ensure full benefit. 
      const highestActiveSub = await Subscription.findOne({
        userId: userId,
        status: { $in: ["ACTIVE", "CANCELLED"] },
        expiresAt: { $gt: new Date() },
      }).sort({ expiresAt: -1 }).lean();

      let baseDate = new Date(); // Default starts today
      if (highestActiveSub && highestActiveSub.expiresAt > baseDate) {
        baseDate = new Date(highestActiveSub.expiresAt); // Append to the end
      }

      const extendedExpiry = new Date(baseDate.getTime());
      extendedExpiry.setDate(extendedExpiry.getDate() + daysToAdd);

      // 2. ALWAYS create a standalone record. Modifying Apple/Google records 
      // directly causes webhook tracking bugs via overwrites. A standalone record is 100% safe.
      await Subscription.create({
        userId: userId,
        platform: "admin_granted",
        customDisplayName: prizeTitle,
        prizeId: prizeId || null,
        productId: "giveaway_prize",
        planType: planType || "1_MONTH",
        status: "ACTIVE",
        autoRenew: false,
        startedAt: baseDate,
        expiresAt: extendedExpiry,
        grantReason: "giveaway_winner",
        source: "GIVEAWAY",
        environment: "production",
      });

      // 3. Synchronize premium state safely
      const UsageService = require("./usage.service");
      await UsageService._syncPremiumState(userId, true);

    } catch (error) {
      logger.error(`Error in handleGiveawayGrant for User ${userId}:`, error.message);
      throw error;
    }
  }

  // ─── INITIATIVE 1: BILLING RETRY ───
  async handleBillingRetryStart(data) {
    const sub = await this._findSubscription(data);
    if (!sub) return;

    sub.isInBillingRetry = true;
    // Initiative says: Keep isPremium: true. So we keep status ACTIVE or set to ACTIVE if it was something else.
    sub.status = "ACTIVE"; 
    await sub.save();
    
    await UsageService._syncPremiumState(sub.userId, true);
    logger.info("Subscription entered Billing Retry mode", { userId: sub.userId });
  }

  // ─── INITIATIVE 2: GRACE PERIOD ───
  async handleGracePeriodStart(data) {
    const sub = await this._findSubscription(data);
    if (!sub) return;

    sub.isInGracePeriod = true;
    sub.status = "GRACE";
    
    // Calculate grace period end if not provided by store
    // iOS (Apple): 6 days, Android (Google): 3 days
    if (data.gracePeriodEndsAt) {
      sub.gracePeriodEndsAt = new Date(data.gracePeriodEndsAt);
    } else {
      const days = sub.platform === 'ios' ? 6 : 3;
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + days);
      sub.gracePeriodEndsAt = endsAt;
    }
    
    await sub.save();
    await UsageService._syncPremiumState(sub.userId, true);
    logger.info("Subscription entered Grace Period", { userId: sub.userId, endsAt: sub.gracePeriodEndsAt });
  }

}

const subscriptionService = new SubscriptionService();
module.exports = subscriptionService;