const express = require("express");
const router = express.Router();
const giveawayController = require("../../modules/giveaway/claim.controller");
const auth = require("../auth/auth.middleware");

router.use(auth);

router.post("/claim", giveawayController.claimPrize);

router.get("/info", giveawayController.getGiveawayInfo);
router.post("/info", giveawayController.updateGiveawayInfo);

router.get("/my-giveaways", giveawayController.getMyGiveaways);

module.exports = router;