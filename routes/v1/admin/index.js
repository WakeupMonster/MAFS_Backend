const express = require("express");
const router = express.Router();

// const auth = require("../../../modules/auth/auth.middleware");
// const asyncHandler = require("../../common/middlewares/asyncHandler");
// Role middleware (admin only)
// const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");
const giveawayAdminRoutes = require("./giveaway.routes");
// const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");
const adminCredential = require("../../../modules/Admin/auth/admin.auth.routes")
const cmsManagement = require("../../../modules/NewAdmin/cms/content.routes")
const userManagement = require("../../../modules/NewAdmin/usersManagement/user.management.route")
const profileReviewRoutes = require("../../../modules/Admin/profileReview/profileReview.routes");
const chatManagementRoutes = require("../../../modules/Admin/chat/adminChat.routes")
const notificationManagementRoutes = require("../../../modules/Admin/adminNotificationCampaigns/adminNotification.routes")
const userRoutes = require("../../../modules/NewAdmin/usersManagement/user.management.route");
const dashboardRoutes = require("../../../modules/NewAdmin/dashboard/dashboard.stats.routes")
const kycAdminRoutes = require("../../../modules/NewAdmin/moderation/moderation.routes")
router.use("/auth",adminCredential)

// router.use(auth);        
// router.use(allowAdminMiddleware);

router.use("/giveaway", giveawayAdminRoutes);
router.use("/users", userRoutes); 
router.use("/cms",cmsManagement)
router.use("/user-management",userManagement)
router.use("/moderation", kycAdminRoutes);
router.use("/dashboard",dashboardRoutes)
router.use("/profile-review", profileReviewRoutes);
router.use("/chat-management",chatManagementRoutes)
router.use("/notification",notificationManagementRoutes)
router.use("/",require("../../../modules/admintester/admintest.route"))
     
module.exports = router;