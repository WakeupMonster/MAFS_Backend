const { SubscriptionEvent } = require("../models/subscription_events");
const appleService = require("../services/apple.service");
const googleService = require("../services/google.service");
const subscriptionService = require("../services/subscription.service");
const { generatePayloadHash } = require("../utils/iap.helpers");

// ═══════════════════════════════
//  APPLE WEBHOOK
// ═══════════════════════════════
exports.appleWebhook = async (req, res) => {
  try {
    const hash = generatePayloadHash(req.body);

    // Decode
    const decoded = appleService.decodeWebhookPayload(
      req.body.signedPayload
    );

    // Save event
    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: "ios",
        source: "WEBHOOK",
        eventType: decoded.notificationType,
        externalEventId: decoded.notificationUUID,
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

    // Turant response
    res.status(200).send("OK");

    // Background process
    processAppleWebhook(decoded, event).catch(console.error);
  } catch (err) {
    console.error("Apple webhook error:", err);
    res.status(500).send("Error");
  }
};

async function processAppleWebhook(decoded, event) {
  try {
    const txn = decoded.transactionInfo || {};
    const renewal = decoded.renewalInfo || {};

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
        data.gracePeriodEndsAt = renewal.gracePeriodExpiresDate;
        await subscriptionService.handleGracePeriod(data);
        break;
      case "EXPIRED":
        await subscriptionService.handleExpire(data);
        break;
      case "REFUND":
        data.refundReason =
          txn.revocationReason === 1 ? "APP_ISSUE" : "OTHER";
        await subscriptionService.handleRefund(data);
        break;
      default:
        console.log("Unhandled Apple event:", decoded.notificationType);
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();
  } catch (err) {
    event.error = {
      message: err.message,
      stack: err.stack,
      retryCount: (event.error?.retryCount || 0) + 1,
    };
    await event.save();
  }
}

// ═══════════════════════════════
//  GOOGLE WEBHOOK
// ═══════════════════════════════
exports.googleWebhook = async (req, res) => {
  try {
    const message = req.body.message;
    const data = googleService.decodeWebhookPayload(message.data);
    const notification = data.subscriptionNotification;

    if (!notification) {
      return res.status(200).send("Not subscription");
    }

    const eventName = googleService.getEventName(
      notification.notificationType
    );

    const hash = generatePayloadHash(data);

    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: "android",
        source: "WEBHOOK",
        eventType: eventName,
        externalEventId: message.messageId,
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

    processGoogleWebhook(notification, eventName, event).catch(
      console.error
    );
  } catch (err) {
    console.error("Google webhook error:", err);
    res.status(500).send("Error");
  }
};

async function processGoogleWebhook(notification, eventName, event) {
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
          detail.cancelReason === 0
            ? "USER_CANCELLED"
            : "BILLING_ERROR";
        await subscriptionService.handleCancel(data);
        break;
      case "IN_GRACE_PERIOD":
      case "ON_HOLD":
        await subscriptionService.handleGracePeriod(data);
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
        console.log("Unhandled Google event:", eventName);
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();
  } catch (err) {
    event.error = {
      message: err.message,
      stack: err.stack,
      retryCount: (event.error?.retryCount || 0) + 1,
    };
    await event.save();
  }
}