const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { validateRegister } = require("./auth.validation");

// POST /api/v1/auth/register
router.post("/register", validateRegister, authController.register);

module.exports = router;
