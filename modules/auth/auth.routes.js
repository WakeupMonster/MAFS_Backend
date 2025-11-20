const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const validation = require("./auth.validation");

// Phone registration & verify
router.post("/register/phone", validation.validatePhone, controller.registerPhone);
router.post("/verify/phone", validation.validateOtp, controller.verifyPhone);

// Email registration & verify
router.post("/register/email",controller.registerEmail);
router.post("/verify/email", controller.verifyEmail); // expects { userId, otp } - validate as needed

// Login by phone
router.post("/login", validation.validatePhone, controller.loginSendOtp);
router.post("/login/verify", validation.validateOtp, controller.loginVerify);

// router.post("/social/google", controller.googleLogin);
// router.post("/social/facebook", controller.facebookLogin);
// router.post("/social/apple", controller.appleLogin);

// Token flows
router.post("/refresh", controller.refreshToken);
router.post("/logout", controller.logout);

// Optional: resend OTP endpoint (by type)
router.post("/resend/phone", validation.validatePhone, controller.registerPhone);
router.post("/resend/email", controller.registerEmail);
module.exports = router;