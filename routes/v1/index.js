const express = require("express");
const router = express.Router();


router.use("/auth", require("../../modules/auth/auth.routes"));
router.use("/profile", require("../../modules/profile/profile.routes"));
router.use("/swipe", require("../../modules/matches/swipe/swipe.routes"));
router.use("/kyc", require("../../modules/profile/profile.routes"));
router.use("/health", require("../public/health.routes"));
router.use("/docs", require("../public/docs.routes"));
router.use("/notifications", require("../../modules/notifications/notification.routes"));

router.use("/fwb", require("../../modules/fwb/fwb.routes"));

module.exports = router;