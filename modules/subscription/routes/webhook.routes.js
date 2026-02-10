const express = require("express");
const router = express.Router();
const { appleWebhook, googleWebhook } = require("../controllers/webhook.controller");
const { verifyAppleWebhook, verifyGoogleWebhook } = require("../middlewares/webhookAuth.middleware");
const { webhookLimiter } = require("../middlewares/rateLimiter.middleware");

router.post("/apple", webhookLimiter, verifyAppleWebhook, appleWebhook);
router.post("/google", webhookLimiter, verifyGoogleWebhook, googleWebhook);

module.exports = router;