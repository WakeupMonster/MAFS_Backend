const express = require("express");
const router = express.Router();
const settingsController = require("./settings.controller");

/**
 * Prefix: /api/admin/settings
 * (Assuming it will be mounted from the main index/server app)
 */

// Route to fetch current dynamic SMTP & OTP settings
router.get("/", settingsController.getSettings);

// Route to update/save SMTP & OTP settings
router.put("/", settingsController.updateSettings);

// Route to test SMTP (Optional utility)
router.post("/test-smtp", settingsController.testSmtpConnection);

module.exports = router;
