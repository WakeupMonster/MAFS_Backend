const express = require("express");
const router = express.Router();
const socketRoutes = require('./socket.routes');

router.use("/auth", require("../../modules/auth/auth.routes"));
router.use("/profile", require("../../modules/profile/profile.routes"));
router.use("/swipe", require("../../modules/matches/swipe/swipe.routes"));
router.use("/kyc", require("../../modules/profile/profile.routes"));
router.use("/health", require("../public/health.routes"));
router.use("/docs", require("../public/docs.routes"));
router.use("/notifications", require("../../modules/notifications/notification.routes"));

// Use routes
router.use('/socket', socketRoutes);
router.use("/fwb", require("../../modules/fwb/fwb.routes"));
router.use("/chat", require("../../modules/matches/chat/chat.route"));

module.exports = router;