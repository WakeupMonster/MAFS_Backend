const express = require("express");
const router = express.Router();
const giveawayController = require("../../modules/giveaway/claim.controller");
const auth = require("../auth/auth.middleware");

router.use(auth);

router.get("/spin-wheel", giveawayController.getSpinWheelConfig);
router.post("/claim", giveawayController.claimPrize);

module.exports = router;
