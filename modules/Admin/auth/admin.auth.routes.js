const express = require("express");
const router = express.Router();
const adminController = require("./auth.admin.controller");
// Middlewares
const auth = require("../../../modules/auth/auth.middleware");
const {
  allowAdmin,
} = require("../../../common/middlewares/allowAdmin.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");

/** @section Public Auth Routes These are accessible without a token */
router.post("/login", apiLimiter("admin_login", 5, 300), adminController.adminLogin);

// Security: Admin registration is disabled in production to prevent unauthorized account creation
if (process.env.NODE_ENV !== "production") {
  router.post("/register", adminController.adminRegister);
}

/*============= POST API'S FORGET PASSWORD =====================*/
router.post("/request-otp", apiLimiter("admin_otp", 3, 300), adminController.sendEmailOTP);
router.post("/verify-otp", apiLimiter("admin_verify_otp", 5, 300), adminController.verifyEmailOTP);
router.patch("/forgot-password", apiLimiter("admin_forgot_pwd", 3, 300), adminController.adminForgotPassword);

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
// --- Protected Admin Routes ---
router.use(auth);
router.use(allowAdmin);

/**
 * @section Protected Auth Routes
 * Note: 'auth' and 'allowAdmin' are already applied in the Master Index
 */
router.post("/reset-password", adminController.adminResetPassword);

module.exports = router;
// Just for testing push
