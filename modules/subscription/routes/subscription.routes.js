// routes/subscription.routes.js
const router = require("express").Router();
const {
  verifyPurchase,
  getStatus,
  getHistory,
  getSubscription,
} = require("../controllers/subscription.controller");
const { protect } = require("../../auth/auth.middleware");

// USER AUTH REQUIRED
router.post("/verify", protect, verifyPurchase);
router.get("/status", protect, getStatus);
router.get("/history", protect, getHistory);
router.get("/details", protect, getSubscription);

module.exports = router;