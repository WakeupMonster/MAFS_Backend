const express = require("express");
const router = express.Router();
const adminCtrl = require("./account.controller");
const { upload, handleMulterError } = require("../../upload/upload.middleware");

router.get("/", adminCtrl.getAdminAccount);
router.patch(
  "/update",
  upload.fields([{ name: "avatar", maxCount: 1 }]),
  handleMulterError,
  adminCtrl.updateAdminAccount,
);

module.exports = router;
