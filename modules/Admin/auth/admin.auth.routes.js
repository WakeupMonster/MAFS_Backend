const express = require("express");
const router = express.Router();
const adminController = require("./auth.admin.controller");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

/*
 * ============= POST API LOGIN =====================
 */
router.post("/login", adminController.adminLogin);

/*
 * ============= POST API REGISTER. BUT WE WILL NOT PROVIDE TO ADMIN =====================
 */
router.post("/register", adminController.adminRegister);

/*
 * ============= POST API'S FORGET PASSWORD =====================
 */
router.post("/send-email-otp", adminController.sendEmailOTP);
router.post("/verify-email-otp", adminController.verifyEmailOTP);
router.post("/forgot-password", adminController.adminForgotPassword);

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
router.use(auth);

/*
 * ============= POST API RESET PASSWORD. WHEN ADMIN ALREADY LOGIN =====================
 */
router.post(
  "/reset-password",
  allowAdminMiddleware,
  adminController.adminResetPassword
);

module.exports = router;
