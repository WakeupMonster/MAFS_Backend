const express = require("express");
const router = express.Router();
const adminController = require("./user.management");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

router.use(auth);
router.use(allowAdminMiddleware);

router.get("/user-list", adminController.SampleGETallUser);

/*
 * ============= GET API FOR EXPORT USERS DATA IN CSV FILE =====================
 */
// ✅ MOVE EXPORT HERE (Above the :userId routes)
// router.get("/export", adminController.GETExportAllUsers);

// Add this near your other middleware (like express.json())
// router.use("/download", express.static(path.join(__dirname, "exports")));

router.get("/export/stream", adminController.streamUsersExport);

router.get("/:userId", adminController.GETSingleUserDetails);

router.patch("/:userId", adminController.UPDATESingleUserDetail);

router.patch("/:userId/status", adminController.UPDATEUserStatus);

module.exports = router;