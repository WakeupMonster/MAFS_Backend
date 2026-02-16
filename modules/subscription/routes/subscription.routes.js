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
} = require("../controllers/subscription.controller");
const { apiLimiter } = require("../middlewares/rateLimiter.middleware");
const {
  validate,
  verifyPurchaseSchema,
} = require("../validators/subscription.validator");
const protect = require("../../auth/auth.middleware");

router.post(
  "/verify",
  apiLimiter,
  protect,
  validate(verifyPurchaseSchema),
  verifyPurchase
);
router.get("/status", apiLimiter, protect, getStatus);
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

module.exports = router;
