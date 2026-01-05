const express = require("express");
const router = express.Router();
const adminController = require("./auth.controller");

router.post("/login", adminController.adminLogin);
router.post("/register", adminController.adminRegister);

module.exports = router;
