const express = require("express");
const router = express.Router();

// Common middlewares
// const auth = require("../../../modules/auth/auth.middleware");
// const asyncHandler = require("../../common/middlewares/asyncHandler");
// Role middleware (admin only)
// const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");

const giveawayAdminRoutes = require("./giveaway.routes");
// const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");
const adminCredential = require("../../../modules/Admin/auth/admin.auth.routes")
// const cmsManagement = require("../../../modules/Admin/cms/content.routes")
const userManagement = require("../../../modules/Admin/usersManagement/user.management.route")
const profileReviewRoutes = require("../../../modules/Admin/profileReview/profileReview.routes");
// router.use(auth);        
// router.use(allowAdminMiddleware);
const chatManagementRoutes = require("../../../modules/Admin/chat/adminChat.routes")
const notificationManagementRoutes = require("../../../modules/Admin/adminNotificationCampaigns/adminNotification.routes")
const {getKpiOverview} = require("../../../modules/admintester/admintestcontroller")


router.use("/giveaway", giveawayAdminRoutes);
router.use("/auth",adminCredential)
// router.use("/cms",cmsManagement)
router.use("/user-management",userManagement)
// router.use("/kyc", kycAdminRoutes);
router.use("/profile-review", profileReviewRoutes);
router.use("/chat-management",chatManagementRoutes)
router.use("/notification-management",notificationManagementRoutes)
router.get("/getkpi",getKpiOverview)
// router.get("/pending-verifications",getPendingVerifications)
module.exports = router;