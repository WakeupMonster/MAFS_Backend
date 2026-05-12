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
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");
const {
  validate,
  verifyPurchaseSchema,
  restorePurchasesSchema
} = require("../validators/subscription.validator");
const protect = require("../../auth/auth.middleware");
const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");

router.post(
  "/verify",
  apiLimiter("sub_verify", 10, 60),
  protect,
  validate(verifyPurchaseSchema),
  verifyPurchase
);

router.post(
  "/restore",
  apiLimiter("sub_restore", 5, 60),
  protect,
  validate(restorePurchasesSchema),
  restorePurchases
);
router.get("/status", apiLimiter("sub_status", 30, 60), protect, getStatus);
router.get("/catalog", apiLimiter("sub_catalog", 20, 60), protect, getCatalog);
router.get("/history", apiLimiter("sub_history", 20, 60), protect, getHistory);
router.get("/details", apiLimiter("sub_details", 20, 60), protect, getSubscription);

// Admin-only routes: Protected with allowAdmin to prevent regular users from accessing sensitive data
router.get("/stats", apiLimiter("sub_admin_stats", 30, 60), protect, allowAdmin, getStats);
router.get("/subsciptionlist", apiLimiter("sub_admin_list", 30, 60), protect, allowAdmin, getAllSubscriptions);
router.get("/user/:userId", apiLimiter("sub_admin_user", 30, 60), protect, allowAdmin, getUserSubscriptionDetail);
router.get("/revenue", apiLimiter("sub_admin_revenue", 20, 60), protect, allowAdmin, getRevenueAnalytics);
router.get("/cancel", apiLimiter("sub_admin_cancel", 20, 60), protect, allowAdmin, getCancellationAnalytics);
router.get("/risk", apiLimiter("sub_admin_risk", 20, 60), protect, allowAdmin, getAtRiskUsers);
router.get("/webhook", apiLimiter("sub_admin_webhook", 20, 60), protect, allowAdmin, getWebhookEvents);
router.get("/alltransection", apiLimiter("sub_admin_txn", 20, 60), protect, allowAdmin, getAllTransactions);

router.post("/test-premium", apiLimiter("test_premium", 3, 3600), protect, makeMePremiumTemp);
router.post("/admin-expire", apiLimiter("admin_expire", 5, 60), protect, allowAdmin, adminExpireSubscription);

module.exports = router;
