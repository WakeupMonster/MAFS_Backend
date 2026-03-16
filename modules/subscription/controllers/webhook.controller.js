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
    const decoded = appleService.decodeWebhookPayload(req.body.signedPayload);

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
    const txn = decoded.transactionInfo || {};
    // const renewal = decoded.renewalInfo || {};

    const data = {
      originalTransactionId: txn.originalTransactionId,
      transactionId: txn.transactionId,
      productId: txn.productId,
      purchaseDate: txn.purchaseDate,
      expiresDate: txn.expiresDate,
      platform: "ios",
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
        }
        break;
      case "DID_FAIL_TO_RENEW":
        // v3: No Grace Period! Treat as immediate expiry.
        await subscriptionService.handleExpire(data);
        break;
      case "EXPIRED":
        await subscriptionService.handleExpire(data);
        break;
      case "REFUND":
        data.refundReason = txn.revocationReason === 1 ? "APP_ISSUE" : "OTHER";
        await subscriptionService.handleRefund(data);
        break;
      default:
        logger.info("Unhandled Apple event:", decoded.notificationType);
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();

    // v3 Sync: Ensure User/Profile flags are updated after any webhook event
    if (data.originalTransactionId) {
      const sub = await require("../models/Subscription").findOne({
        originalTransactionId: data.originalTransactionId,
      });
      if (sub) {
        const isActive =
          ["ACTIVE", "CANCELLED"].includes(sub.status) &&
          sub.expiresAt > new Date();
        UsageService._syncPremiumState(sub.userId, isActive).catch((err) =>
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
    const notification = data.subscriptionNotification;

    if (!notification) {
      logger.info("Google webhook - not a subscription event");
      return res.status(200).send("Not subscription");
    }

    const eventName = googleService.getEventName(notification.notificationType);
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

    _processGoogleWebhook(notification, eventName, event).catch((err) => {
      logger.error("Google webhook processing failed:", err.message);
    });
  } catch (err) {
    logger.error("Google webhook error:", err.message);
    return res.status(500).send("Error");
  }
};

async function _processGoogleWebhook(notification, eventName, event) {
  try {
    const detail = await googleService.verifySubscription(
      notification.subscriptionId,
      notification.purchaseToken
    );

    const data = {
      purchaseToken: notification.purchaseToken,
      productId: notification.subscriptionId,
      purchaseDate: parseInt(detail.startTimeMillis),
      expiresDate: parseInt(detail.expiryTimeMillis),
      orderId: detail.orderId,
      platform: "android",
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
      case "ON_HOLD":
        // v3: No Grace Period! Treat as immediate expiry.
        await subscriptionService.handleExpire(data);
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

    event.processed = true;
    event.processedAt = new Date();
    await event.save();

    // v3 Sync: Ensure User/Profile flags are updated after any webhook event
    if (data.purchaseToken) {
      const sub = await require("../models/Subscription").findOne({
        purchaseToken: data.purchaseToken,
      });
      if (sub) {
        const isActive =
          ["ACTIVE", "CANCELLED"].includes(sub.status) &&
          sub.expiresAt > new Date();
        UsageService._syncPremiumState(sub.userId, isActive).catch((err) =>
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

module.exports = { appleWebhook, googleWebhook };
