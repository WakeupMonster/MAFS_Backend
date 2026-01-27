const express = require("express");
const router = express.Router();
const adminController = require("./user.management");

// List all users
router.get("/", adminController.SampleGETallUser);

router.get("/export/stream", adminController.streamUsersExport);
router.get("/:userId", adminController.GETSingleUserDetails);

router.patch("/:userId", adminController.UPDATESingleUserDetail);

router.patch("/:userId/status", adminController.UPDATEUserStatus);

module.exports = router;