const express = require("express");
const router = express.Router();
const adminController = require("./user.management");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");
const path = require("path");

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
router.use(auth);
router.use(allowAdminMiddleware);

/*
 * ============= GET ALL USERS – ADMIN DATATABLE & Search or filters =====================
 * ============ API 1: GET api/v1/admin/user-management/user-list
 */
router.get("/user-list", adminController.SampleGETallUser);

/*
 * ============= GET API FOR EXPORT USERS DATA IN CSV FILE =====================
 */
// ✅ MOVE EXPORT HERE (Above the :userId routes)
// router.get("/export", adminController.GETExportAllUsers);

// Add this near your other middleware (like express.json())
// router.use("/download", express.static(path.join(__dirname, "exports")));

router.get("/export/stream", adminController.streamUsersExport);

/*
 * ============= GET API FOR SINGLE USER DETAILS =====================
 * ============ GET /api/v1/admin/user-management/:userId
 */
router.get("/:userId", adminController.GETSingleUserDetails);

/*
 * ============= PATCH API FOR UPDATE EXISITING USER DETAIL =====================
 */
router.patch("/:userId", adminController.UPDATESingleUserDetail);

/*
 * ============= PATCH API FOR UPDATE EXISITING USER ACCOUNT STATUS =====================
 */
router.patch("/:userId/status", adminController.UPDATEUserStatus);

module.exports = router;
