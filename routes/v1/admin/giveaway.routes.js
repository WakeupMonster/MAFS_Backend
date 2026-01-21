const express = require("express");
const router = express.Router();
const validate = require("../../../modules/giveaway/admin/giveaway.validation");
const adminGiveawayController = require("../../../modules/giveaway/admin/giveaway.controller");

router.post(
  "/prizes",
  validate("adminCreatePrize"),
  adminGiveawayController.createPrize
);

router.get(
  "/prizes",
  adminGiveawayController.getAllPrizes
);

router.patch(
  "/prizes/:id",
  //   validate("adminUpdatePrize"),
  adminGiveawayController.updatePrize
);

router.delete("/prizes/:id",adminGiveawayController.deletePrize)
router.delete("/campaigns/:id",adminGiveawayController.deleteCampaign)
router.post(
  "/campaigns",
  //   validate("adminCreateCampaign"),
  adminGiveawayController.createCampaign
);

router.get("/campaigns", adminGiveawayController.getAllCampaigns);

router.patch(
  "/campaigns/:id",
  //   validate("adminUpdateCampaign"),
  adminGiveawayController.updateCampaign
);

router.get("/campaigns/:id/winner", adminGiveawayController.getWinner);

router.post("/campaigns/:id/resend-prize", adminGiveawayController.resendPrize);

router.post("/mark-as-deliver", adminGiveawayController.markPrizeAsDelivered);

router.get("/pending-deliveries", adminGiveawayController.getPendingDeliveries);

router.get("/claims", adminGiveawayController.getAllClaims);

router.get("/campaigns/winner/:id/", adminGiveawayController.getWinner);

router.get("/get-delivered-price", adminGiveawayController.getDeliveredPrizes);

router.get("/audit", adminGiveawayController.getGiveawayAuditReport);

router.post(
  "/campaigns/bulk",
  // validate("adminBulkCreateCampaign"),
  adminGiveawayController.bulkCreateCampaignByRanges
);

router.patch("/campaigns/:id/disable", adminGiveawayController.disableCampaign);

router.patch(
  "/campaigns/:campaignId/pause",
  adminGiveawayController.pauseCampaign
);

module.exports = router;
// const runGiveawayWorker = require("../../../jobs/giveaway/giveaway.worker");

// router.post(
//   "/run-cron",
//   async (req, res) => {
//     await runGiveawayWorker();
//     return res.json({
//       success: true,
//       message: "Giveaway cron executed manually"
//     });
//   }
// );
// module.exports = router;