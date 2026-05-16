/* eslint-disable no-case-declarations */
const SubscriptionEvent = require("../models/SubscriptionEvent");
const appleService = require("../services/apple.service");
const googleService = require("../services/google.service");
const subscriptionService = require("../services/subscription.service");
const UsageService = require("../services/usage.service");
const { generatePayloadHash } = require("../utils/iap.helpers");
const logger = require("../utils/logger");

// ─── APPLE WEBHOOK ───
const appleWebhook = async (req, res) => {
  try {
    const hash = generatePayloadHash(req.body);

    // v3: Verify signature (True Production mode)
    const decoded = await appleService.verifyAndDecodeJWS(req.body.signedPayload);

    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: "ios",
        source: "WEBHOOK",
        eventType: decoded.notificationType || "UNKNOWN",
        externalEventId: decoded.notificationUUID || null,
        payloadHash: hash,
        rawPayload: req.body,
        processed: false,
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        logger.warn("Duplicate Apple webhook", { hash: hash });
        return res.status(200).send("Duplicate");
      }
      throw err;
    }

    res.status(200).send("OK");

    _processAppleWebhook(decoded, event).catch((err) => {
      logger.error("Apple webhook processing failed:", err.message);
    });
  } catch (err) {
    logger.error("Apple webhook error:", err.message);
    return res.status(500).send("Error");
  }
};

async function _processAppleWebhook(decoded, event) {
  try {
    // If using signature verification, nested parts might still be signed JWS
    let txn = {};
    if (decoded.data && decoded.data.signedTransactionInfo) {
      txn = appleService.decodeJWS(decoded.data.signedTransactionInfo);
    } else {
      txn = decoded.transactionInfo || {};
    }

    const data = {
      originalTransactionId: txn.originalTransactionId,
      transactionId: txn.transactionId,
      productId: txn.productId,
      purchaseDate: txn.purchaseDate,
      expiresDate: txn.expiresDate,
      platform: "ios",
      environment: (decoded.environment || "production").toLowerCase(),
      isSandbox: decoded.environment === "Sandbox",
      isAutoRenewal: txn.autoRenewStatus === 1,
      rawResponse: decoded,
    };

    switch (decoded.notificationType) {
      case "SUBSCRIBED":
        await subscriptionService.handlePurchase(data);
        break;
      case "DID_RENEW":
        await subscriptionService.handleRenew(data);
        break;
      case "DID_CHANGE_RENEWAL_STATUS":
        if (decoded.subtype === "AUTO_RENEW_DISABLED") {
          await subscriptionService.handleCancel(data);
        } else if (decoded.subtype === "AUTO_RENEW_ENABLED") {
          await subscriptionService.handleReActivate(data);
        }
        break;
      case "DID_FAIL_TO_RENEW":
        // Apple bhejta hai subtype: "GRACE_PERIOD" agar grace period ON ho
        if (decoded.subtype === "GRACE_PERIOD") {
          await subscriptionService.handleGracePeriodStart(data);
        } else {
          await subscriptionService.handleBillingRetryStart(data);
        }
        break;
      case "GRACE_PERIOD_EXPIRED":
        await subscriptionService.handleExpire(data);
        break;
      case "EXPIRED":
        await subscriptionService.handleExpire(data);
        break;
      case "REFUND":
        data.refundReason = txn.revocationReason === 1 ? "APP_ISSUE" : "OTHER";
        // await subscriptionService.handleRefund(data);
        // break;

        // Check if the refunded item was a Consumable or a Subscription
        const Product = require("../models_v3/Product");
        const catalogProduct = await Product.findOne({ appleProductId: data.productId }).lean();
        if (catalogProduct && catalogProduct.type === 'CONSUMABLE') {
          // Apple Consumables ki history me transactionId save hota hai
          data.purchaseToken = data.originalTransactionId || data.transactionId;
          await subscriptionService.handleConsumableRefund(data);
        } else {
          // Normal Subscription refund
          await subscriptionService.handleRefund(data);
        }
        break;

      default:
        logger.info("Unhandled Apple event:", decoded.notificationType);
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();

    // v3 Sync: Respect Grace Period and Billing Retry during sync
    if (data.originalTransactionId || data.purchaseToken) {
      const Subscription = require("../models/Subscription");
      const sub = await Subscription.findOne({
        $or: [
          { originalTransactionId: data.originalTransactionId },
          { purchaseToken: data.purchaseToken }
        ]
      });

      if (sub) {
        // const hasPremiumAccess = await sub.hasAccess();
        const hasPremiumAccess = Subscription.hasPremiumAccess(sub);
        UsageService._syncPremiumState(sub.userId, hasPremiumAccess).catch((err) =>
          logger.error("Webhook Sync Error:", err)
        );
      }
    }

    logger.info("Apple webhook processed", {
      eventType: decoded.notificationType,
      eventId: event._id,
    });
  } catch (err) {
    event.error = {
      message: err.message,
      stack: err.stack,
      retryCount: (event.error ? event.error.retryCount : 0) + 1,
    };
    await event.save();
    logger.error("Apple webhook process error:", err.message);
  }
}

// ─── GOOGLE WEBHOOK ───
const googleWebhook = async (req, res) => {
  try {
    const message = req.body.message;
    const data = googleService.decodeWebhookPayload(message.data);

    // Check both paths: subscriptions and one-time products
    const notification = data.subscriptionNotification || data.oneTimeProductNotification;
    const isConsumable = !!data.oneTimeProductNotification;

    if (!notification) {
      logger.info("Google webhook - not a subscription or product event");
      return res.status(200).send("Not supported event");
    }

    // Map the event name properly depending on the product type
    let eventName;
    if (isConsumable) {
      // OneTimeProductNotification only has 1 or 2 states (1 = PURCHASED, 2 = CANCELED)
      eventName = notification.notificationType === 1 ? "CONSUMABLE_PURCHASED" : "CONSUMABLE_CANCELED";
    } else {
      eventName = googleService.getEventName(notification.notificationType);
    }

    const hash = generatePayloadHash(data);

    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: "android",
        source: "WEBHOOK",
        eventType: eventName,
        externalEventId: message.messageId || null,
        payloadHash: hash,
        rawPayload: req.body,
        processed: false,
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        logger.warn("Duplicate Google webhook", { hash: hash });
        return res.status(200).send("Duplicate");
      }
      throw err;
    }

    res.status(200).send("OK");

    _processGoogleWebhook(notification, eventName, event, isConsumable).catch((err) => {
      logger.error("Google webhook processing failed:", err.message);
    });
  } catch (err) {
    logger.error("Google webhook error:", err.message);
    return res.status(500).send("Error");
  }
};






async function _processGoogleWebhook(notification, eventName, event, isConsumable = false) {
  try {
    let data;

    if (isConsumable) {
      // It's a oneTimeProductNotification
      const productId = notification.sku; // For consumables, Google uses 'sku'
      const detail = await googleService.verifyConsumable(
        productId,
        notification.purchaseToken
      );

      data = {
        purchaseToken: notification.purchaseToken,
        productId: productId,
        purchaseDate: parseInt(detail.purchaseTimeMillis) || Date.now(),
        expiresDate: null,
        orderId: detail.orderId,
        platform: "android",
        transactionId: detail.orderId,
        gatewayTransactionId: detail.orderId,
        environment: "production",
        isSandbox: false,
        rawResponse: detail,
      };

      if (eventName === "CONSUMABLE_PURCHASED") {
        await subscriptionService.handlePurchase(data);
        await googleService.acknowledgeConsumable(productId, notification.purchaseToken);
      }
      // Note: Consumables don't have RENEWED, EXPIRED etc. Canceled means revoked.
      if (eventName === "CONSUMABLE_CANCELED") {
        // await subscriptionService.handleRefund(data);
        await subscriptionService.handleConsumableRefund(data);
      }

    } else {
      // It's a subscriptionNotification
      const detail = await googleService.verifySubscription(
        notification.subscriptionId,
        notification.purchaseToken
      );

      data = {
        purchaseToken: notification.purchaseToken,
        productId: notification.subscriptionId,
        purchaseDate: parseInt(detail.startTimeMillis),
        expiresDate: parseInt(detail.expiryTimeMillis),
        orderId: detail.orderId,
        platform: "android",
        transactionId: detail.orderId, // Use orderId as transactionId for Google
        gatewayTransactionId: detail.orderId,
        environment: "production", // Google webhooks are usually production, but detail might have more info
        isSandbox: false, // detail.purchaseType === 0 ? true : false (test purchase)
        isAutoRenewal: detail.autoRenewing,
        rawResponse: detail,
      };

      switch (eventName) {
        case "PURCHASED":
        case "RECOVERED":
        case "RESTARTED":
          await subscriptionService.handlePurchase(data);
          await googleService.acknowledgePurchase(
            notification.subscriptionId,
            notification.purchaseToken
          );
          break;
        case "RENEWED":
          await subscriptionService.handleRenew(data);
          break;
        case "CANCELED":
          data.cancellationReason =
            detail.cancelReason === 0 ? "USER_CANCELLED" : "BILLING_ERROR";
          await subscriptionService.handleCancel(data);
          break;
        case "IN_GRACE_PERIOD":
          await subscriptionService.handleGracePeriodStart(data);
          break;
        case "ON_HOLD":
          await subscriptionService.handleBillingRetryStart(data);
          break;
        case "EXPIRED":
          await subscriptionService.handleExpire(data);
          break;
        case "REVOKED":
          await subscriptionService.handleRefund(data);
          break;
        case "PAUSED":
          await subscriptionService.handlePause(data);
          break;
        default:
          logger.info("Unhandled Google event:", eventName);
      }
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();

    // Sync logic already handled by the unified block above if merged, 
    // but here we ensure Google also uses the unified hasAccess() check.
    if (data.purchaseToken) {
      const Subscription = require("../models/Subscription");
      const sub = await Subscription.findOne({ purchaseToken: data.purchaseToken });
      if (sub) {
        const hasPremiumAccess = Subscription.hasPremiumAccess(sub);
        UsageService._syncPremiumState(sub.userId, hasPremiumAccess).catch((err) =>
          logger.error("Webhook Sync Error:", err)
        );
      }
    }

    logger.info("Google webhook processed", {
      eventType: eventName,
      eventId: event._id,
    });
  } catch (err) {
    event.error = {
      message: err.message,
      stack: err.stack,
      retryCount: (event.error ? event.error.retryCount : 0) + 1,
    };
    await event.save();
    logger.error("Google webhook process error:", err.message);
  }
}

// ─── REVENUECAT WEBHOOK ───
const revenuecatWebhook = async (req, res) => {
  try {
    const rcEvent = req.body.event;
    if (!rcEvent) {
      return res.status(400).send("No event data");
    }

    const hash = generatePayloadHash(req.body);

    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: rcEvent.store === "app_store" ? "ios" : "android",
        source: "REVENUECAT",
        eventType: rcEvent.type,
        externalEventId: rcEvent.id,
        payloadHash: hash,
        rawPayload: req.body,
        processed: false,
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(200).send("Duplicate");
      }
      throw err;
    }

    res.status(200).send("OK");

    _processRevenueCatWebhook(rcEvent, event).catch((err) => {
      logger.error("RevenueCat webhook processing failed:", err.message);
    });
  } catch (err) {
    logger.error("RevenueCat webhook error:", err.message);
    return res.status(500).send("Error");
  }
};

async function _processRevenueCatWebhook(rcEvent, event) {
  try {
    const data = {
      userId: rcEvent.app_user_id,
      originalTransactionId: rcEvent.original_transaction_id,
      transactionId: rcEvent.transaction_id,
      gatewayTransactionId: rcEvent.transaction_id,
      productId: rcEvent.product_id,
      purchaseDate: rcEvent.purchased_at_ms,
      expiresDate: rcEvent.expiration_at_ms,
      platform: rcEvent.store === "app_store" ? "ios" : "android",
      environment: (rcEvent.environment || "production").toLowerCase(),
      isSandbox: rcEvent.environment === "SANDBOX",
      isAutoRenewal: true, // RC events for renewals usually imply auto-renew is on
      rawResponse: rcEvent,
    };

    switch (rcEvent.type) {
      case "INITIAL_PURCHASE":
        await subscriptionService.handlePurchase(data);
        break;
      case "RENEWAL":
        await subscriptionService.handleRenew(data);
        break;
      case "CANCELLATION":
        data.cancellationReason = rcEvent.cancel_reason || "USER_CANCELLED";
        await subscriptionService.handleCancel(data);
        break;
      case "EXPIRATION":
        await subscriptionService.handleExpire(data);
        break;
      case "BILLING_ISSUE":
        await subscriptionService.handleBillingRetryStart(data);
        break;
      case "REFUND":
        await subscriptionService.handleRefund(data);
        break;
      default:
        logger.info("Unhandled RevenueCat event:", rcEvent.type);
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();

    logger.info("RevenueCat webhook processed", {
      eventType: rcEvent.type,
      eventId: event._id,
    });
  } catch (err) {
    event.error = {
      message: err.message,
      stack: err.stack,
      retryCount: (event.error ? event.error.retryCount : 0) + 1,
    };
    await event.save();
    logger.error("RevenueCat webhook process error:", err.message);
  }
}

module.exports = { appleWebhook, googleWebhook, revenuecatWebhook };
