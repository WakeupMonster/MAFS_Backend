const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const validation = require("./auth.validation");
const socialRoutes = require("./social/social.routes");

router.post("/phone", validation.validateSendPhoneOtp, controller.sendOtp);
router.post("/verify", controller.verifyOtp);

router.post(
  "/phonetest",
  validation.validateSendPhoneOtp,
  controller.sendTestOtp,
);
router.post("/verifytestotp", controller.verifyTestOtp);

router.post(
  "/register/email",
  validation.validateRegisterEmail,
  controller.registerEmail,
);
router.post("/verify/email", controller.verifyEmail);

router.post(
  "/refresh",
  validation.validateRefreshToken,
  controller.refreshToken,
);
router.post("/logout", validation.validateLogout, controller.logout);

router.post("/resend/phone", controller.sendTestOtp);
router.post(
  "/resend/email",
  validation.validateRegisterEmail,
  controller.resendEmailOtp,
);

router.use("/social", socialRoutes);

module.exports = router;
