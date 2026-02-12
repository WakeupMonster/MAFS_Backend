const express = require("express");
const router = express.Router();
const { appleWebhook, googleWebhook } = require("../controllers/webhook.controller");
const { verifyAppleWebhook, verifyGoogleWebhook } = require("../middlewares/webhookAuth.middleware");
const { webhookLimiter } = require("../middlewares/rateLimiter.middleware");

// Real webhooks
router.post("/apple", webhookLimiter, verifyAppleWebhook, appleWebhook);
router.post("/google", webhookLimiter, verifyGoogleWebhook, googleWebhook);

// ═══════════════════════════════════════
// TEST ENDPOINTS (Sirf development mein)
// ═══════════════════════════════════════
if (process.env.NODE_ENV !== "production") {
  const {
    testAppleWebhook,
    testGoogleWebhook,
  } = require("../controllers/webhookTest.controller");

  router.post("/test/apple", testAppleWebhook);
  router.post("/test/google", testGoogleWebhook);
}

module.exports = router;