const express = require("express");
const router = express.Router();
const adminController = require("./user.management.controller");

// List all users
router.get("/", adminController.GETAllUsers);

// List ghosting users
router.get("/ghosting/list", adminController.GETGhostingUsers);

/*====== GET API FOR EXPORT USERS DATA IN CSV FILE =========*/
// Export users (Streamed for performance with large datasets)
router.get("/export/stream", adminController.streamUsersExport);

// Get specific user details
router.get("/:userId", adminController.GETSingleUserDetails);

// Update user profile/details
router.patch("/:userId", adminController.UPDATESingleUserDetail);

router.delete("/:userId/photos/delete", adminController.DELETEPhoto);

// Update user status (Ban, Deactivate, Activate)
router.patch("/:userId/status", adminController.UPDATEUserStatus);

module.exports = router;
