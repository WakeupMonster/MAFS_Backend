// routes/webhook.routes.js
const router = require("express").Router();
const {
  appleWebhook,
  googleWebhook,
} = require("../controllers/webhook.controller");
const {
  verifyAppleWebhook,
  verifyGoogleWebhook,
} = require("../middlewares/webhookAuth.middleware");

// NO USER AUTH - Store call karta hai
router.post("/apple", verifyAppleWebhook, appleWebhook);
router.post("/google", verifyGoogleWebhook, googleWebhook);

module.exports = router;