const express = require("express");
const router = express.Router();
const adminController = require("./auth.admin.controller");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

router.post("/login", adminController.adminLogin);
router.post("/register", adminController.adminRegister);

/*
 * ============= POST API'S FORGET PASSWORD =====================
 */
router.post("/request-otp", adminController.sendEmailOTP);
router.post("/verify-otp", adminController.verifyEmailOTP);
router.patch("/forgot-password", adminController.adminForgotPassword);

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
router.use(auth);
router.post(
  "/reset-password",
  allowAdminMiddleware,
  adminController.adminResetPassword
);
module.exports = router;