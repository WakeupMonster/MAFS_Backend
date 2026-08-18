const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const validation = require("./auth.validation");
const socialRoutes = require("./social/social.routes");
const { apiLimiter } = require("../../common/middlewares/apiLimiter");

// OTP & Auth Rate Limiters (Redis Based)
const otpSendLimiter = apiLimiter("otp_send", 10, 300); // 10 req / 5 mins
const otpVerifyLimiter = apiLimiter("otp_verify", 20, 300); // 20 req / 5 mins
const loginLimiter = apiLimiter("login", 10, 300); // 10 req / 5 mins
const refreshLimiter = apiLimiter("token_refresh", 10, 60); // 10 req / 1 min
const resendLimiter = apiLimiter("otp_resend", 10, 300); // 10 req / 5 mins

router.post("/phone", validation.validateSendPhoneOtp, otpSendLimiter, controller.sendOtp);
router.post("/verify", otpVerifyLimiter, controller.verifyOtp);

router.post("/phonetest", validation.validateSendPhoneOtp, otpSendLimiter, controller.sendTestOtp);
router.post("/verifytestotp", otpVerifyLimiter, controller.verifyTestOtp);

router.post("/register/email", validation.validateRegisterEmail, otpSendLimiter, controller.registerEmail);
router.post("/verify/email", otpVerifyLimiter, controller.verifyEmail);

router.post("/refresh", validation.validateRefreshToken, refreshLimiter, controller.refreshToken);
router.post("/logout", controller.logout);

router.post("/resend/phone", resendLimiter, controller.sendTestOtp);
router.post(
  "/resend/email",
  validation.validateRegisterEmail,
  resendLimiter,
  controller.resendEmailOtp,
);

router.use("/social", socialRoutes);

module.exports = router;