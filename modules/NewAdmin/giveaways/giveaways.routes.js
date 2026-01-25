const express = require("express");
const router = express.Router();
const validate = require("./giveaway.validation");
const ctrl = require("./giveaways.controller");

/** @section Prize Management */
router.get("/prizes", ctrl.getAllPrizes);
router.post("/prizes", validate("adminCreatePrize"), ctrl.createPrize);
router.patch("/prizes/:id", ctrl.updatePrize);
router.delete("/prizes/:id", ctrl.deletePrize);

/** @section Campaign Management */
router.get("/campaigns", ctrl.getAllCampaigns);
router.post("/campaigns", ctrl.createCampaign);
router.patch("/campaigns/:id", ctrl.updateCampaign);
router.delete("/campaigns/:id", ctrl.deleteCampaign);
router.post("/campaigns/bulk", ctrl.bulkCreateCampaignByRanges);

// Campaign Controls (State changes)
router.patch("/campaigns/:id/disable", ctrl.disableCampaign);
router.patch("/campaigns/:id/pause", ctrl.pauseCampaign);

/** @section Winners & Claims */
router.get("/campaigns/:id/winner", ctrl.getWinner);
router.post("/campaigns/:id/resend-prize", ctrl.resendPrize);
router.get("/claims", ctrl.getAllClaims);

/** @section Logistics & Audit */
router.get("/deliveries/pending", ctrl.getPendingDeliveries);
router.get("/deliveries/completed", ctrl.getDeliveredPrizes);
router.post("/mark-as-deliver", ctrl.markPrizeAsDelivered);
router.get("/audit", ctrl.getGiveawayAuditReport);

module.exports = router;
