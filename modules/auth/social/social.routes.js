/**
 * Social Authentication Routes
 * Endpoints for Google, Facebook, and Apple login
 */

const express = require("express");
const router = express.Router();
const controller = require("./social.controller");
const validation = require("./social.validation");
const authMiddleware = require("../auth.middleware");

/**
 * POST /api/v1/auth/social/login
 * Unified endpoint for all social providers
 * 
 * Body:
 * {
 *   "provider": "google|facebook|apple",
 *   "idToken": "...",           // For Google & Apple
 *   "accessToken": "...",       // For Facebook
 *   "deviceId": "...",          // Optional
 *   "fcmToken": "..."           // Optional
 * }
 */
router.post(
  "/login",
  validation.validateSocialLogin,
  controller.socialLogin
);

/**
 * POST /api/v1/auth/social/link
 * Link a social account to existing user
 * Requires: Authentication token
 * 
 * Body:
 * {
 *   "provider": "google|facebook|apple",
 *   "idToken": "...",           // For Google & Apple
 *   "accessToken": "..."        // For Facebook
 * }
 */
router.post(
  "/link",
  authMiddleware,
  validation.validateSocialLink,
  controller.linkSocialAccount
);

/**
 * POST /api/v1/auth/social/unlink
 * Unlink a social account from user
 * Requires: Authentication token
 * 
 * Body:
 * {
 *   "provider": "google|facebook|apple"
 * }
 */
router.post(
  "/unlink",
  authMiddleware,
  validation.validateSocialUnlink,
  controller.unlinkSocialAccount
);

/**
 * GET /api/v1/auth/social/accounts
 * Get user's linked social accounts
 * Requires: Authentication token
 */
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
