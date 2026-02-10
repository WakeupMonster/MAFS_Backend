const appleService = require("../services/apple.service");
const googleService = require("../services/google.service");
const subscriptionService = require("../services/subscription.service");

// ─── VERIFY PURCHASE (App se call hogi) ───
exports.verifyPurchase = async (req, res) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { platform, receipt, purchaseToken, productId, transactionId } =
      req.body;
    const userId = req.user._id;

    if (!platform || !productId) {
      return res
        .status(400)
        .json({ success: false, error: "platform and productId required" });
    }

    let subscriptionData;

    if (platform === "ios") {
      if (!transactionId) {
        return res
          .status(400)
          .json({ success: false, error: "transactionId required for iOS" });
      }

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
      if (!purchaseToken) {
        return res.status(400).json({
          success: false,
          error: "purchaseToken required for Android",
        });
      }

      const result = await googleService.verifySubscription(
        productId,
        purchaseToken
      );

      subscriptionData = {
        userId,
        platform: "android",
        productId,
        purchaseToken,
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
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        expiresAt: subscription.expiresAt,
        autoRenew: subscription.autoRenew,
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
    const access = await subscriptionService.checkAccess(req.user._id);
    res.json({ success: true, ...access });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── TRANSACTION HISTORY ───
exports.getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await subscriptionService.getTransactionHistory(
      req.user._id,
      limit
    );
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET SUBSCRIPTION DETAILS ───
exports.getSubscription = async (req, res) => {
  try {
    const sub = await subscriptionService.getUserSubscription(req.user._id);

    if (!sub) {
      return res.json({
        success: true,
        subscription: null,
        message: "No subscription found",
      });
    }

    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};