const express = require("express");
const router = express.Router();
const giveawayController = require("../../modules/giveaway/claim.controller");
const auth = require("../auth/auth.middleware");

const { allowAdmin } = require("../../common/middlewares/allowAdmin.middleware");
const { apiLimiter } = require("../../common/middlewares/apiLimiter");

router.use(auth);

router.post("/claim", apiLimiter("giveaway_claim", 5, 60), giveawayController.claimPrize); // 5 req / 1 min
router.get("/info", apiLimiter("giveaway_info", 20, 60), giveawayController.getGiveawayInfo); // 20 req / 1 min
router.post("/info", allowAdmin, giveawayController.updateGiveawayInfo);
router.get("/my-giveaways", apiLimiter("my_giveaways", 20, 60), giveawayController.getMyGiveaways); // 20 req / 1 min

module.exports = router;