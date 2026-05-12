const express = require("express");
const router = express.Router();
const controller = require("./social.controller");
const validation = require("./social.validation");
const authMiddleware = require("../auth.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");

const socialLoginLimiter = apiLimiter("social_login", 10, 300); // 10 req / 5 mins

router.post(
  "/login",
  // validation.validateSocialLogin,
  socialLoginLimiter,
  controller.socialLogin
);

router.post(
  "/link",
  authMiddleware,
  validation.validateSocialLink,
  controller.linkSocialAccount
);

router.post(
  "/unlink",
  authMiddleware,
  validation.validateSocialUnlink,
  controller.unlinkSocialAccount
);

router.get(
  "/accounts",
  authMiddleware,
  controller.getLinkedAccounts
);

router.get(
  "/callback",
  controller.handleCallback
);

module.exports = router;