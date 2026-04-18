/**
 * DEV-ONLY Routes — Subscription Testing
 * These routes are registered ONLY when NODE_ENV === "development"
 * See app.js for the conditional check.
 */
const express = require("express");
const router = express.Router();
const protect = require("../../auth/auth.middleware");
const { resetUserToFree, debugUserState } = require("./dev.controller");

// Reset user's subscription to FREE (for re-testing purchase flow)
router.post("/subscription/reset", protect, resetUserToFree);

// Debug: Get full subscription state for a user
router.get("/subscription/debug/:userId", protect, debugUserState);

// Self-debug: Get your own state using your token
router.get("/subscription/debug", protect, debugUserState);

module.exports = router;
