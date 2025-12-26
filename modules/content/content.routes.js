const express = require("express");
const router = express.Router();
const controller = require("./content.controller");

// Public APIs (NO AUTH)
router.get("/faq", controller.getFAQ);
router.get("/privacy-policy", controller.getPrivacyPolicy);
router.get("/terms-conditions", controller.getTermsConditions);

module.exports = router;