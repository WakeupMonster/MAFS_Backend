const express = require("express");
const router = express.Router();
const adminController = require("./user.management");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
router.use(auth);
router.use(allowAdminMiddleware);

/*
 * ============= GET ALL USERS – ADMIN DATATABLE & Search or filters =====================
 * ============ API 1: GET api/v1/admin/user-management/user-list
 */
// router.get("/user-list", adminController.GETAllUsers);
router.get("/user-list", adminController.SampleGETallUser);
// router.get("/sample-user-list", adminController.SampleGETallUser);

// GET /api/v1/admin/user-management/:userId
router.get("/:userId", adminController.GETSingleUserDetails);

router.patch("/:userId", adminController.UPDATESingleUserDetail);
router.patch("/:userId/status", adminController.UPDATEUserStatus);
router.get("/export", adminController.GETExportAllUsers);

module.exports = router;
