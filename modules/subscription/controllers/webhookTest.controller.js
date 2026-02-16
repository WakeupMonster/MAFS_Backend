const SubscriptionEvent = require("../models/SubscriptionEvent");
const subscriptionService = require("../services/subscription.service");
const { generatePayloadHash } = require("../utils/iap.helpers");
const logger = require("../utils/logger");

const testAppleWebhook = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    const {
      eventType,
      transactionId,
      originalTransactionId,
      productId,
      expiresDate,
      userId,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: "eventType is required",
        validEvents: [
          "SUBSCRIBED",
          "DID_RENEW",
          "DID_CHANGE_RENEWAL_STATUS",
          "DID_FAIL_TO_RENEW",
          "EXPIRED",
          "REFUND",
        ],
        example: {
          eventType: "SUBSCRIBED",
          originalTransactionId: "MOCK_ORIG_TXN_001",
          transactionId: "TXN_001",
          productId: "com.myapp.premium.monthly",
          userId: "507f1f77bcf86cd799439011",
        },
      });
    }

    const txn = {
      transactionId: transactionId || "TXN_" + Date.now(),
      originalTransactionId: originalTransactionId || "MOCK_ORIG_TXN_001",
      productId: productId || "com.myapp.premium.monthly",
      purchaseDate: Date.now(),
      expiresDate: expiresDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    const renewal = {
      autoRenewStatus: 1,
      gracePeriodExpiresDate: Date.now() + 16 * 24 * 60 * 60 * 1000,
    };

    const hash = generatePayloadHash(req.body);
    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: "ios",
        source: "WEBHOOK",
        eventType: eventType,
        externalEventId: "test-" + Date.now(),
        payloadHash: hash,
        rawPayload: req.body,
        processed: false,
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(200).json({
          success: true,
          message: "Duplicate event - already processed",
        });
      }
      throw err;
    }

    const data = {
      originalTransactionId: txn.originalTransactionId,
      transactionId: txn.transactionId,
      productId: txn.productId,
      purchaseDate: txn.purchaseDate,
      expiresDate: txn.expiresDate,
      platform: "ios",
    };

    let result;

    try {
      switch (eventType) {
        case "SUBSCRIBED":
          data.userId = userId || "507f1f77bcf86cd799439011";
          result = await subscriptionService.handlePurchase(data);
          break;

        case "DID_RENEW":
          result = await subscriptionService.handleRenew(data);
          break;

        case "DID_CHANGE_RENEWAL_STATUS":
          result = await subscriptionService.handleCancel(data);
          break;

        case "DID_FAIL_TO_RENEW":
          data.gracePeriodEndsAt = renewal.gracePeriodExpiresDate;
          result = await subscriptionService.handleGracePeriod(data);
          break;

        case "EXPIRED":
          result = await subscriptionService.handleExpire(data);
          break;

        case "REFUND":
          data.refundReason = "APP_ISSUE";
          result = await subscriptionService.handleRefund(data);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: "Unknown eventType: " + eventType,
          });
      }

      event.processed = true;
      event.processedAt = new Date();
      if (result) {
        event.subscriptionId = result._id;
      }
      await event.save();

      return res.json({
        success: true,
        message: eventType + " processed successfully",
        subscription: result
          ? {
              id: result._id,
              status: result.status,
              autoRenew: result.autoRenew,
              expiresAt: result.expiresAt,
              planType: result.planType,
            }
          : null,
        eventId: event._id,
      });
    } catch (processErr) {
      event.error = {
        message: processErr.message,
        retryCount: 1,
      };
      await event.save();

      return res.status(400).json({
        success: false,
        error: processErr.message,
        hint: "Pehle SUBSCRIBED event bhejo subscription create karne ke liye",
      });
    }
  } catch (err) {
    logger.error("Test Apple webhook error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const testGoogleWebhook = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    const {
      eventType,
      purchaseToken,
      subscriptionId,
      expiresDate,
      userId,
      cancelReason,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: "eventType is required",
        validEvents: [
          "PURCHASED",
          "RENEWED",
          "CANCELED",
          "IN_GRACE_PERIOD",
          "ON_HOLD",
          "EXPIRED",
          "REVOKED",
          "PAUSED",
        ],
        example: {
          eventType: "PURCHASED",
          purchaseToken: "TEST_GOOGLE_TOKEN_001",
          subscriptionId: "com.myapp.premium.monthly",
          userId: "507f1f77bcf86cd799439011",
        },
      });
    }

    const token = purchaseToken || "TEST_GOOGLE_TOKEN_001";
    const subId = subscriptionId || "com.myapp.premium.monthly";

    const hash = generatePayloadHash(req.body);
    let event;
    try {
      event = await SubscriptionEvent.create({
        platform: "android",
        source: "WEBHOOK",
        eventType: eventType,
        externalEventId: "test-google-" + Date.now(),
        payloadHash: hash,
        rawPayload: req.body,
        processed: false,
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(200).json({
          success: true,
          message: "Duplicate event",
        });
      }
      throw err;
    }

    const data = {
      purchaseToken: token,
      productId: subId,
      purchaseDate: Date.now(),
      expiresDate: expiresDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
      orderId: "GPA.TEST-" + Date.now(),
      platform: "android",
    };

    let result;

    try {
      switch (eventType) {
        case "PURCHASED":
        case "RECOVERED":
        case "RESTARTED":
          data.userId = userId || "507f1f77bcf86cd799439011";
          result = await subscriptionService.handlePurchase(data);
          break;

        case "RENEWED":
          result = await subscriptionService.handleRenew(data);
          break;

        case "CANCELED":
          data.cancellationReason =
            cancelReason === "billing" ? "BILLING_ERROR" : "USER_CANCELLED";
          result = await subscriptionService.handleCancel(data);
          break;

        case "IN_GRACE_PERIOD":
        case "ON_HOLD":
          result = await subscriptionService.handleGracePeriod(data);
          break;

        case "EXPIRED":
          result = await subscriptionService.handleExpire(data);
          break;

        case "REVOKED":
          result = await subscriptionService.handleRefund(data);
          break;

        case "PAUSED":
          result = await subscriptionService.handlePause(data);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: "Unknown eventType: " + eventType,
          });
      }

      event.processed = true;
      event.processedAt = new Date();
      if (result) {
        event.subscriptionId = result._id;
      }
      await event.save();

      return res.json({
        success: true,
        message: eventType + " processed successfully",
        subscription: result
          ? {
              id: result._id,
              status: result.status,
              autoRenew: result.autoRenew,
              expiresAt: result.expiresAt,
              planType: result.planType,
            }
          : null,
        eventId: event._id,
      });
    } catch (processErr) {
      event.error = {
        message: processErr.message,
        retryCount: 1,
      };
      await event.save();

      return res.status(400).json({
        success: false,
        error: processErr.message,
        hint: "Pehle PURCHASED event bhejo subscription create karne ke liye",
      });
    }
  } catch (err) {
    logger.error("Test Google webhook error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = { testAppleWebhook, testGoogleWebhook };
