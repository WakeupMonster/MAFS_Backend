// src/modules/kyc/kyc.routes.js

const express = require("express");
const router = express.Router();
const kycController = require("./kyc.controller");

// POST → Submit or Update KYC
router.post("/submit", kycController.submitKyc);

// GET → Fetch KYC
router.get("/:userId", kycController.getKyc);

module.exports = router;