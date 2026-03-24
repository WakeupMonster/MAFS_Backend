const router = require("express").Router();
const controller = require("./appSettings.controller");

// Public API (no auth needed)
router.get("/social-links", controller.getSocialLinks);
router.post("/social-links", controller.upsertSocialLinks);

module.exports = router;
