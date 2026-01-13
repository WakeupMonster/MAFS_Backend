const express = require("express");
const router = express.Router();

// const validate = require("../../../modules/giveaway/admin/giveaway.validation");

// Controllers (baad me banenge)
const adminGiveawayController = require("../../../modules/giveaway/admin/giveaway.controller");

// const auth = require("../../../modules/auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");


// missing api Monthly bulk create missing

router.post(
  "/prizes",
  //   validate("adminCreatePrize"),
  allowAdminMiddleware,
  adminGiveawayController.createPrize
);

router.get( "/prizes", allowAdminMiddleware, adminGiveawayController.getAllPrizes );

router.patch(
  "/prizes/:id",
  //   validate("adminUpdatePrize"),
allowAdminMiddleware,
adminGiveawayController.updatePrize
);

/**
 * 📅 GIVEAWAY CAMPAIGNS
 */
router.post(
  "/campaigns",
  //   validate("adminCreateCampaign"),
  allowAdminMiddleware,
  adminGiveawayController.createCampaign
);

router.get( "/campaigns", allowAdminMiddleware, adminGiveawayController.getAllCampaigns );

router.patch(
  "/campaigns/:id",
  //   validate("adminUpdateCampaign"),
  allowAdminMiddleware,
  adminGiveawayController.updateCampaign
);

router.get(
  "/campaigns/:id/winner",
  adminGiveawayController.getWinner
);

router.post("/campaigns/:id/resend-prize", allowAdminMiddleware, adminGiveawayController.resendPrize);

router.post("/mark-as-deliver", allowAdminMiddleware, adminGiveawayController.markPrizeAsDelivered);

router.get("/pending-deliveries", allowAdminMiddleware, adminGiveawayController.getPendingDeliveries);

router.get("/claims", allowAdminMiddleware, adminGiveawayController.getAllClaims);


router.get("/campaigns/winner/:id/", allowAdminMiddleware, adminGiveawayController.getWinner );

router.get("/get-delivered-price", allowAdminMiddleware, adminGiveawayController.getDeliveredPrizes );

router.get("/audit", allowAdminMiddleware, adminGiveawayController.getGiveawayAuditReport );

router.post(
  "/campaigns/bulk",
  // validate("adminBulkCreateCampaign"),
  allowAdminMiddleware,
  adminGiveawayController.bulkCreateCampaignByRanges
);

router.patch(
  "/campaigns/:id/disable",
  allowAdminMiddleware,
  adminGiveawayController.disableCampaign
);

router.patch(
  "/campaigns/:campaignId/pause",
  allowAdminMiddleware,
  adminGiveawayController.pauseCampaign
);

/**
 * ⚠️ TEMPORARY – CRON TEST ROUTE
 * REMOVE AFTER TESTING
 */
const runGiveawayWorker = require("../../../jobs/giveaway/giveaway.worker");

router.post("/run-cron", async (req, res) => {
  await runGiveawayWorker();
  return res.json({
    success: true,
    message: "Giveaway cron executed manually",
  });
});

module.exports = router;