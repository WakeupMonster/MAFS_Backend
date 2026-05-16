const express = require("express");
const router = express.Router();
const {
  appleWebhook,
  googleWebhook,
  revenuecatWebhook,
} = require("../controllers/webhook.controller");
const {
  verifyAppleWebhook,
  verifyGoogleWebhook,
} = require("../middlewares/webhookAuth.middleware");
const { webhookLimiter } = require("../middlewares/rateLimiter.middleware");

router.post("/apple", webhookLimiter, verifyAppleWebhook, appleWebhook);
router.post("/google", webhookLimiter, verifyGoogleWebhook, googleWebhook);
router.post("/revenuecat", webhookLimiter, revenuecatWebhook);

const {
  testAppleWebhook,
  testGoogleWebhook,
  testRevenueCatWebhook,
} = require("../controllers/webhookTest.controller");
router.post("/test/apple", testAppleWebhook);
router.post("/test/google", testGoogleWebhook);
router.post("/test/revenuecat", testRevenueCatWebhook);

module.exports = router;
