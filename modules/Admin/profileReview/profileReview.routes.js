const express = require("express");
const router = express.Router();
const {
  getReportedProfiles,
  getProfileForReview,
  updateProfileStatus,
} = require("./profileReview.controller");

router.get("/reported", getReportedProfiles);
router.get("/:userId", getProfileForReview);
router.put("/:userId/status", updateProfileStatus);

module.exports = router;