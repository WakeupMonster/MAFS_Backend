const express = require("express");
const router = express.Router();
const adminController = require("./auth.admin.controller");
// Middlewares
const auth = require("../../../modules/auth/auth.middleware");
const {
  allowAdmin,
} = require("../../../common/middlewares/allowAdmin.middleware");

/** @section Public Auth Routes These are accessible without a token */
router.post("/login", adminController.adminLogin);

// Security: Admin registration is disabled in production to prevent unauthorized account creation
if (process.env.NODE_ENV !== "production") {
  router.post("/register", adminController.adminRegister);
}

/*============= POST API'S FORGET PASSWORD =====================*/
router.post("/request-otp", adminController.sendEmailOTP);
router.post("/verify-otp", adminController.verifyEmailOTP);
router.patch("/forgot-password", adminController.adminForgotPassword);

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
