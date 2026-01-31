const express = require("express");
const router = express.Router();
const adminController = require("./auth.admin.controller");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

router.post("/login", adminController.adminLogin);
router.post("/register", adminController.adminRegister);
router.post("/send-email-otp", adminController.sendEmailPassOTP);
// router.post("/verify-email-otp", adminController.verifyEmailOTP);
router.post("/forgot-password", adminController.adminForgotPassword);
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