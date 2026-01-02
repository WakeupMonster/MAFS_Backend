const express = require("express");
const router = express.Router();

// const validate = require("../../../modules/giveaway/admin/giveaway.validation");

// Controllers (baad me banenge)
const adminGiveawayController = require("../../../modules/giveaway/admin/giveaway.controller");

router.post(
  "/kyc-approve",
//   validate("adminCreatePrize"),
  adminGiveawayController.quickVerifyUser
);


module.exports = router;
