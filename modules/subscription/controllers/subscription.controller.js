const appleService = require("../services/apple.service");
const googleService = require("../services/google.service");
const subscriptionService = require("../services/subscription.service");
const logger = require("../utils/logger");

const verifyPurchase = async (req, res, next) => {
  try {
    const { platform, productId, transactionId, purchaseToken } = req.body;
    const userId = req.user._id;

    let subscriptionData;

    if (platform === "ios") {
      const result = await appleService.verifyTransaction(transactionId);

      subscriptionData = {
        userId: userId,
        platform: "ios",
        productId: result.productId || productId,
        originalTransactionId: result.originalTransactionId,
        transactionId: result.transactionId,
        purchaseDate: result.purchaseDate,
        expiresDate: result.expiresDate,
      };
    } else if (platform === "android") {
      const result = await googleService.verifySubscription(productId, purchaseToken);

      subscriptionData = {
        userId: userId,
        platform: "android",
        productId: productId,
        purchaseToken: purchaseToken,
        orderId: result.orderId,
        purchaseDate: parseInt(result.startTimeMillis),
        expiresDate: parseInt(result.expiryTimeMillis),
      };

      await googleService.acknowledgePurchase(productId, purchaseToken);
    }

    const subscription = await subscriptionService.handlePurchase(subscriptionData);

    logger.info("Purchase verified", {
      userId: userId,
      platform: platform,
      subscriptionId: subscription._id,
    });

    return res.json({
      success: true,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        expiresAt: subscription.expiresAt,
        autoRenew: subscription.autoRenew,
      },
    });
  } catch (err) {
    logger.error("Verify purchase error:", err.message);
    return next(err);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const access = await subscriptionService.checkAccess(req.user._id);

    return res.json({
      success: true,
      ...access,
    });
  } catch (err) {
    logger.error("Get status error:", err.message);
    return next(err);
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

    return res.json({
      success: true,
      subscription: sub || null,
    });
  } catch (err) {
    logger.error("Get subscription error:", err.message);
    return next(err);
  }
};

module.exports = { verifyPurchase, getStatus, getHistory, getSubscription };