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
const advancedDashboardCtrl = require("../../../modules/Admin/dashboard/dashboard.advanced.controller");
const moderationRoutes = require("../../../modules/Admin/moderation/moderation.routes");
const giveawayRoutes = require("../../../modules/Admin/giveaways/giveaways.routes");
const profileReviewRoutes = require("../../../modules/Admin/profileReview/profileReview.routes");
const chatRoutes = require("../../../modules/Admin/chat/adminChat.routes");
const notificationRoutes = require("../../../modules/Admin/adminNotificationCampaigns/adminNotification.routes");
const fakeProfileRoutes = require("../../../modules/Admin/fakeProfiles/fakeProfile.routes");
const subscriptionAdminRoutes = require("../../../modules/subscription/routes/admin.routes");
const transactionRoutes = require("../../../modules/subscription/routes/transaction.routes");
const settingsRoutes = require("../../../modules/Admin/settings/settings.routes"); // Added Settings Routes
const uploadRoutes = require("../../../modules/upload/upload.routes");

// --- Public Admin Routes ---
// Login and Forget Password shouldn't require an Auth token
router.use("/auth", authRoutes);

// --- Protected Admin Routes ---
// Apply security to EVERYTHING below this line automatically
router.use(auth);
router.use(allowAdmin);

router.use("/subscription", subscriptionAdminRoutes);
router.use("/transactions", transactionRoutes);
router.use("/account", accountRoutes);
router.use("/users", userRoutes);
router.use("/cms", cmsRoutes);
router.use("/giveaway", giveawayRoutes);
router.use("/dashboard", dashboardRoutes);
// Advanced Dashboard API

router.get(
  "/dashboard-v2/advanced-metrics",
  advancedDashboardCtrl.getAdvancedDashboardMetrics,
);
router.use("/moderation", moderationRoutes);
router.use("/profile-review", profileReviewRoutes);
router.use("/chat", chatRoutes); // Cleaned name from "chat-management"
router.use("/notification", notificationRoutes);
router.use("/fake-profiles", fakeProfileRoutes);
router.use("/settings", settingsRoutes); // Settings API Mounted
router.use("/upload", uploadRoutes);

module.exports = router;