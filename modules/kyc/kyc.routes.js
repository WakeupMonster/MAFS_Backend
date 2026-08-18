// // // src/modules/kyc/kyc.routes.js

// const express = require("express");
// const router = express.Router();
// const kycController = require("./kyc.controller");

// // POST → Submit or Update KYC
// router.post("/submit", kycController.submitKyc);

// // GET → Fetch KYC
// router.get("/:userId", kycController.getKyc);

// module.exports = router;



const express = require('express');
const router = express.Router();
const kycController = require('./kyc.controller');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB per file

// Submit KYC with files
router.post(
  '/submit',
  upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'idVerification', maxCount: 1 }
  ]),
  kycController.submitKyc
);

// Get KYC
router.get('/:userId', kycController.getKyc);

module.exports = router;