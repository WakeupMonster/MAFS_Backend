const express = require("express");
const router = express.Router();
const {
  verifyPurchase,
  getStatus,
  getHistory,
  getSubscription,
  getStats,
  getAllSubscriptions,
  getUserSubscriptionDetail,
  getRevenueAnalytics,
  getCancellationAnalytics,
  getAtRiskUsers,
  getWebhookEvents,
  getAllTransactions,
  makeMePremiumTemp,
  getCatalog,
  restorePurchases,
  adminExpireSubscription
} = require("../controllers/subscription.controller");
const { apiLimiter } = require("../middlewares/rateLimiter.middleware");
const {
  validate,
  verifyPurchaseSchema,
  restorePurchasesSchema
} = require("../validators/subscription.validator");
const protect = require("../../auth/auth.middleware");
const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");

router.post(
  "/verify",
  apiLimiter,
  protect,
  validate(verifyPurchaseSchema),
  verifyPurchase
);

router.post(
  "/restore",
  apiLimiter,
  protect,
  validate(restorePurchasesSchema),
  restorePurchases
);
router.get("/status", apiLimiter, protect, getStatus);
router.get("/catalog", apiLimiter, protect, getCatalog);
router.get("/history", apiLimiter, protect, getHistory);
router.get("/details", apiLimiter, protect, getSubscription);

// Admin-only routes: Protected with allowAdmin to prevent regular users from accessing sensitive data
router.get("/stats", apiLimiter, protect, allowAdmin, getStats);
router.get("/subsciptionlist", apiLimiter, protect, allowAdmin, getAllSubscriptions);
router.get("/user/:userId", apiLimiter, protect, allowAdmin, getUserSubscriptionDetail);
router.get("/revenue", apiLimiter, protect, allowAdmin, getRevenueAnalytics);
router.get("/cancel", apiLimiter, protect, allowAdmin, getCancellationAnalytics);
router.get("/risk", apiLimiter, protect, allowAdmin, getAtRiskUsers);
router.get("/webhook", apiLimiter, protect, allowAdmin, getWebhookEvents);
router.get("/alltransection", apiLimiter, protect, allowAdmin, getAllTransactions);

router.post("/test-premium", protect, makeMePremiumTemp);
router.post("/admin-expire", protect, allowAdmin, adminExpireSubscription);

module.exports = router;
