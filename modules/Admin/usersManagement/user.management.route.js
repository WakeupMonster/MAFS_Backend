const express = require("express");
const router = express.Router();
const adminController = require("./user.management");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

router.use(auth);
router.use(allowAdminMiddleware);

router.get("/user-list", adminController.SampleGETallUser);

router.get("/export", adminController.GETExportAllUsers);

router.get("/:userId", adminController.GETSingleUserDetails);

router.patch("/:userId", adminController.UPDATESingleUserDetail);

router.patch("/:userId/status", adminController.UPDATEUserStatus);

module.exports = router;