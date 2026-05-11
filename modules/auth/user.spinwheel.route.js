const express = require("express");
const router = express.Router();
const giveawayController = require("../../modules/giveaway/claim.controller");
const auth = require("../auth/auth.middleware");

const { allowAdmin } = require("../../common/middlewares/allowAdmin.middleware");

router.use(auth);

router.post("/claim", giveawayController.claimPrize);

router.get("/info", giveawayController.getGiveawayInfo);
router.post("/info", allowAdmin, giveawayController.updateGiveawayInfo);

router.get("/my-giveaways", giveawayController.getMyGiveaways);

module.exports = router;