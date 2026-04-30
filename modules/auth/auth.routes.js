const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const validation = require("./auth.validation");
const socialRoutes = require("./social/social.routes");

const rateLimit = require("express-rate-limit");

// OTP Rate Limiter: 3 requests per 5 minutes per Phone/Email
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, 
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.phone || req.body.email || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many OTP requests. Please try again after 5 minutes.",
    });
  },
});

router.post("/phone", validation.validateSendPhoneOtp, otpLimiter, controller.sendOtp);
router.post("/verify", controller.verifyOtp);

router.post(
  "/phonetest",
  validation.validateSendPhoneOtp,
  otpLimiter,
  controller.sendTestOtp,
);
router.post("/verifytestotp", controller.verifyTestOtp);

router.post(
  "/register/email",
  validation.validateRegisterEmail,
  otpLimiter,
  controller.registerEmail,
);
router.post("/verify/email", controller.verifyEmail);

router.post(
  "/refresh",
  validation.validateRefreshToken,
  controller.refreshToken,
);
router.post("/logout", validation.validateLogout, controller.logout);

router.post("/resend/phone", otpLimiter, controller.sendTestOtp);
router.post(
  "/resend/email",
  validation.validateRegisterEmail,
  otpLimiter,
  controller.resendEmailOtp,
);

router.use("/social", socialRoutes);

module.exports = router;