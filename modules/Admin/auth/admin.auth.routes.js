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
router.post("/register", adminController.adminRegister);

/*============= POST API'S FORGET PASSWORD =====================*/
router.post("/request-otp", adminController.sendEmailOTP);
router.post("/verify-otp", adminController.verifyEmailOTP);
router.patch("/forgot-password", adminController.adminForgotPassword);

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
// --- Protected Admin Routes ---
router.use(auth);
router.get("/profile", adminController.getProfile);

// Update admin name
router.put("/profile/update-name", adminController.updateName);

// Send OTP to new email for verification
router.post("/profile/send-email-otp", adminController.sendEmailOTP);

// Verify OTP and update email
router.post("/profile/verify-email-otp", adminController.verifyEmailOTP);


router.post(
  "/reset-password",
  allowAdminMiddleware,
  adminController.adminResetPassword
);
module.exports = router;
