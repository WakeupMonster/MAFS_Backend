// const express = require("express");
// const router = express.Router();

// const auth = require("../../../modules/auth/auth.middleware");
// // const asyncHandler = require("../../common/middlewares/asyncHandler");
// // Role middleware (admin only)
// // const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");
// const giveawayAdminRoutes = require("../../../modules/Admin/giveaways/giveaways.routes");
// // const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");
// // const adminCredential = require("../../../modules/Admin/auth/admin.auth.routes")
// const cmsManagement = require("../../../modules/NewAdmin/cms/content.routes")
// const userManagement = require("../../../modules/NewAdmin/usersManagement/user.management.route")
// const profileReviewRoutes = require("../../../modules/Admin/profileReview/profileReview.routes");
// const chatManagementRoutes = require("../../../modules/Admin/chat/adminChat.routes")
// const notificationManagementRoutes = require("../../../modules/Admin/adminNotificationCampaigns/adminNotification.routes")
// const userRoutes = require("../../../modules/NewAdmin/usersManagement/user.management.route");
// const dashboardRoutes = require("../../../modules/NewAdmin/dashboard/dashboard.stats.routes")
// const kycAdminRoutes = require("../../../modules/Admin/moderation/moderation.routes")
// // router.use("/auth",adminCredential)

// router.use(auth);
// // router.use(allowAdminMiddleware);
// router.use("/giveaway", giveawayAdminRoutes);
// router.use("/users", userRoutes);
// router.use("/cms",cmsManagement)
// router.use("/user-management",userManagement)
// router.use("/moderation", kycAdminRoutes);
// router.use("/dashboard",dashboardRoutes)
// router.use("/profile-review", profileReviewRoutes);
// router.use("/chat-management",chatManagementRoutes)
// router.use("/notification",notificationManagementRoutes)
// router.use("/",require("../../../modules/admintester/admintest.route"))

// module.exports = router;

// routes/v1/admin/index.js
const express = require("express");
const router = express.Router();

// Middlewares
const auth = require("../../../modules/auth/auth.middleware");
const {
  allowAdmin,
} = require("../../../common/middlewares/allowAdmin.middleware");

// Sub-Route Imports
const authRoutes = require("../../../modules/Admin/auth/admin.auth.routes");
const accountRoutes = require("../../../modules/Admin/account/account.routes");
const userRoutes = require("../../../modules/Admin/usersManagement/user.management.route");
const cmsRoutes = require("../../../modules/Admin/cms/content.routes");
const dashboardRoutes = require("../../../modules/Admin/dashboard/dashboard.stats.routes");
const moderationRoutes = require("../../../modules/Admin/moderation/moderation.routes");
const giveawayRoutes = require("../../../modules/Admin/giveaways/giveaways.routes");
const profileReviewRoutes = require("../../../modules/Admin/profileReview/profileReview.routes");
const chatRoutes = require("../../../modules/Admin/chat/adminChat.routes");
const notificationRoutes = require("../../../modules/Admin/adminNotificationCampaigns/adminNotification.routes");
const fakeProfileRoutes = require("../../../modules/Admin/fakeProfiles/fakeProfile.routes");

const subscriptionAdminRoutes = require("../../../modules/subscription/routes/admin.routes");

// --- Public Admin Routes ---
// Login and Forget Password shouldn't require an Auth token
router.use("/auth", authRoutes);

// --- Protected Admin Routes ---
// Apply security to EVERYTHING below this line automatically
router.use(auth);
router.use(allowAdmin);

router.use("/subscription", subscriptionAdminRoutes);
router.use("/account", accountRoutes);
router.use("/users", userRoutes); // Cleaned name from "user-management"
router.use("/cms", cmsRoutes);
router.use("/giveaway", giveawayRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/moderation", moderationRoutes);
router.use("/profile-review", profileReviewRoutes);
router.use("/chat", chatRoutes); // Cleaned name from "chat-management"
router.use("/notification", notificationRoutes);
router.use("/fake-profiles", fakeProfileRoutes);

module.exports = router;
