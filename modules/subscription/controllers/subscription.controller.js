const appleService = require("../services/apple.service");
const googleService = require("../services/google.service");
const mongoose = require("mongoose");
const subscriptionService = require("../services/subscription.service");

const verifyPurchase = async (req, res, next) => {
  try {
    const { platform, productId, transactionId, purchaseToken } = req.body;
    const userId = req.user._id;

    if (!platform || !productId) {
      return res
        .status(400)
        .json({ success: false, error: "platform and productId required" });
    }

    let subscriptionData;

    if (platform === "ios") {
      const result = await appleService.verifyTransaction(transactionId);

      subscriptionData = {
        userId,
        platform: "ios",
        productId: result.productId || productId,
        originalTransactionId: result.originalTransactionId,
        transactionId: result.transactionId,
        purchaseDate: result.purchaseDate,
        expiresDate: result.expiresDate,
      };
    } else if (platform === "android") {
      const result = await googleService.verifySubscription(
        productId,
        purchaseToken
      );

      subscriptionData = {
        userId,
        platform: "android",
        productId: productId,
        purchaseToken: purchaseToken,
        orderId: result.orderId,
        purchaseDate: parseInt(result.startTimeMillis),
        expiresDate: parseInt(result.expiryTimeMillis),
      };

      await googleService.acknowledgePurchase(productId, purchaseToken);
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Invalid platform" });
    }

    const subscription = await subscriptionService.handlePurchase(
      subscriptionData
    );

    res.json({
      success: true,
      purchaseType: "SUBSCRIPTION",
      subscription: {
        id: sub._id,
        status: sub.status,
        planType: sub.planType,
        expiresAt: sub.expiresAt,
        autoRenew: sub.autoRenew,
      },
    });
  } catch (err) {
    console.error("Verify purchase error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─── CHECK STATUS (App open hone pe) ───
exports.getStatus = async (req, res) => {
  try {
    const UsageService = require("../services/usage.service");

    // v3: Full status with quotas, wallet, features, and subscription info
    const usageStatus = await UsageService.getUsageStatus(req.user._id);

    // Also get subscription details for backward compatibility
    const access = await subscriptionService.checkAccess(req.user._id);
    res.json({ success: true, ...access });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await subscriptionService.getTransactionHistory(
      req.user._id,
      limit
    );

    return res.json({
      success: true,
      transactions: transactions,
    });
  } catch (err) {
    logger.error("Get history error:", err.message);
    return next(err);
  }
};

const getSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.getUserSubscription(req.user._id);

    if (!sub) {
      return res.json({
        success: true,
        data: null,
        message: "No subscription found",
      });
    }

    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};