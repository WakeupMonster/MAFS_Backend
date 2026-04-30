const express = require("express");
const router = express.Router();
const ctrl = require("./moderation.controller");

router.get("/pending-verifications", ctrl.getPendingVerifications);
router.get("/blocks", ctrl.getBlockedUsers);
router.post("/users/:userId/verify", ctrl.verifyUserProfile);
router.post("/users/:id/ban", ctrl.banUser);
router.post("/users/:id/unban", ctrl.unbanUser);
router.post("/users/:id/suspend", ctrl.suspendUser);
router.post("/users/:id/unsuspend", ctrl.unsuspendUser);
router.post("/reports/:reportId/status", ctrl.updateReportStatus);
router.post("/reports/:reportId/reply", ctrl.replyToReport);

module.exports = router;
