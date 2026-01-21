const express = require("express");
const router = express.Router();
const auth = require("../auth/auth.middleware");
const {getKpiOverview,verifyUserProfile,banUser,unbanUser,suspendUser,replyToReport,updateReportStatus,getBlockedUsers} = require("./admintestcontroller")

router.use(auth);

router.get("/getkpi",getKpiOverview)
router.get("/blocks",getBlockedUsers)
router.post("/users/:userId/verify",verifyUserProfile)
router.post("/users/:id/ban",banUser)
router.post("/users/:id/unban",unbanUser)
router.post("/users/:id/suspend",suspendUser)  //Auto-unsuspend job (cron / worker)
router.post("/reports/:reportId/status",updateReportStatus)
router.post("/reports/:reportId/reply",replyToReport)

// Auto-unsuspend job (cron / worker)
module.exports = router;
