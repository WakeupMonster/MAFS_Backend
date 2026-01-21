const express = require("express");
const router = express.Router();
const controller = require("./social.controller");
const validation = require("./social.validation");
const authMiddleware = require("../auth.middleware");


router.post(
  "/login",
  // validation.validateSocialLogin,
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