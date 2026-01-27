const express = require("express");
const router = express.Router();
const adminController = require("./auth.admin.controller");

const auth = require("../../../modules/auth/auth.middleware");
const  allowAdmin = require("../../../common/middlewares/allowAdmin.middleware");

console.log("auth:", auth);
console.log("allowAdmin:", allowAdmin);

router.post("/login", adminController.adminLogin);
router.post("/register", adminController.adminRegister);

router.post("/request-otp", adminController.sendEmailOTP);
router.post("/verify-otp", adminController.verifyEmailOTP);
router.patch("/forgot-password", adminController.adminForgotPassword);

router.use(auth);
router.use(allowAdmin);

router.post("/reset-password", adminController.adminResetPassword);

module.exports = router;