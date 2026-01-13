const express = require("express");
const router = express.Router();
const socketRoutes = require("./socket.routes");

router.use("/auth", require("../../modules/auth/auth.routes"));
router.use("/profile", require("../../modules/profile/profile.routes"));
router.use("/swipe", require("../../modules/matches/swipe/swipe.routes"));
router.use("/kyc", require("../../modules/profile/profile.routes"));
router.use("/health", require("../public/health.routes"));
router.use("/docs", require("../public/docs.routes"));
router.use(
  "/notifications",
  require("../../modules/notifications/notification.routes")
);
router.use("/giveaway", require("../../modules/auth/user.spinwheel.route"));
// Use routes
router.use("/socket", socketRoutes);
router.use("/fwb", require("../../modules/fwb/fwb.routes"));
router.use("/chat", require("../../modules/matches/chat/chat.route"));
router.use("/contacts",require("../../modules/BlockedContact/contacts.routes"))
router.use("/admintest",require("../../modules/admintester/admintest.route"))
router.use("/app-settings",require("../../modules/AppConfiguration/appSettings.route"))

// Deactivate account
router.use(
  "/account",
  require("../../modules/Account/deactivate & active/account.routes")
);

router.use("/account", require("../../modules/Account/deactivate & active/account.routes"));

router.use("/content",require("../../modules/content/content.routes"))

router.use("/contact",require("../../modules/AppConfiguration/contactSupport/support.routes"))

// BOOST
router.use("/boost", require("../../modules/Boost/boost.route"));

// ADMIN routes
router.use("/admin", require("../v1/admin/index"));

module.exports = router;

// Today giveaway status API ka code
// spinwheel supportive enum
