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

router.get("/stats", apiLimiter, protect, getStats);
router.get("/subsciptionlist", apiLimiter, protect, getAllSubscriptions);
router.get("/user/:userId", apiLimiter, protect, getUserSubscriptionDetail);
router.get("/revenue", apiLimiter, protect, getRevenueAnalytics);
router.get("/cancel", apiLimiter, protect, getCancellationAnalytics);
router.get("/risk", apiLimiter, protect, getAtRiskUsers);
router.get("/webhook", apiLimiter, protect, getWebhookEvents);
router.get("/alltransection", apiLimiter, protect, getAllTransactions);

router.post("/test-premium", protect, makeMePremiumTemp);
router.post("/admin-expire", protect, adminExpireSubscription);

module.exports = router;
