const express = require("express");
const router = express.Router();
const adminController = require("./user.management");

// List all users
router.get("/", adminController.SampleGETallUser);

/*
 * ============= GET API FOR EXPORT USERS DATA IN CSV FILE =====================
 */
// Export users (Streamed for performance with large datasets)
// Note: Placed above /:userId to prevent "export" being treated as an ID
router.get("/export/stream", adminController.streamUsersExport);

/* @section Individual User Operations */

// Get specific user details
router.get("/:userId", adminController.GETSingleUserDetails);

// Update user profile/details
router.patch("/:userId", adminController.UPDATESingleUserDetail);

router.delete("/:userId/photos/delete", adminController.DELETEPhoto);

// Update user status (Ban, Deactivate, Activate)
router.patch("/:userId/status", adminController.UPDATEUserStatus);

module.exports = router;
