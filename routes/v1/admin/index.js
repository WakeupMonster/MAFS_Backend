const express = require("express");
const router = express.Router();

// Common middlewares
const auth = require("../../../modules/auth/auth.middleware");
// const asyncHandler = require("../../common/middlewares/asyncHandler");

// Role middleware (admin only)
// const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");

// Admin routes
const giveawayAdminRoutes = require("./giveaway.routes");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

// const kycAdminRoutes = require('./kyc.routes');

/*
 * ============= FOR AUTHENTICATION =====================
 */
router.use("/auth", require("../../../modules/Admin/auth/admin.auth.routes"));

/**
 * ADMIN GLOBAL MIDDLEWARE
 * Ye middleware is folder ke sabhi routes par lagega
 */

router.use(auth); // user must be logged in
router.use(allowAdminMiddleware); // user must be ADMIN / SUPER_ADMIN

/**.
 * MODULE-WISE ADMIN ROUTES
 */
router.use("/giveaway", giveawayAdminRoutes);
// router.use("/kyc", kycAdminRoutes);

/*
 * ============= FOR CMS: FAQ, PRIVACY & POLICY, T&C =====================
 */
router.use("/cms", require("../../../modules/Admin/cms/content.routes"));

/*
 * ============= FOR USER-MANAGEMENT =====================
 */
router.use(
  "/user-management",
  require("../../../modules/Admin/usersManagement/user.management.route")
);

module.exports = router;
