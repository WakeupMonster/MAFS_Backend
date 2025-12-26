const express = require("express");
const router = express.Router();

// const validate = require("../../../modules/giveaway/admin/giveaway.validation");

// Controllers (baad me banenge)
const adminGiveawayController = require("../../../modules/giveaway/admin/giveaway.controller");


/**
 * 🎁 PRIZE MANAGEMENT
 */

// missing api Monthly bulk create missing

router.post(
  "/prizes",
//   validate("adminCreatePrize"),
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

/**
 * 📅 GIVEAWAY CAMPAIGNS
 */
router.post(
  "/campaigns",
//   validate("adminCreateCampaign"),
  adminGiveawayController.createCampaign
);

router.get(
  "/campaigns",
  adminGiveawayController.getAllCampaigns
);

router.patch(
  "/campaigns/:id",
//   validate("adminUpdateCampaign"),
  adminGiveawayController.updateCampaign
);

/**
 * 🏆 WINNER & RECOVERY
 */

router.get(
  "/campaigns/:id/winner",
  adminGiveawayController.getWinner
);

router.post(
  "/campaigns/:id/resend-prize",
  adminGiveawayController.resendPrize
);


router.post(
  "/mark-as-deliver",
  adminGiveawayController.markPrizeAsDelivered
); 

router.get("/pending-deliveries",adminGiveawayController.getPendingDeliveries)

router.get("/claims",adminGiveawayController.getAllClaims)

// router.post("/claim",adminGiveawayController.claimPrize)

router.get("/campaigns/winner/:id/",adminGiveawayController.getWinner)

router.get("/get-delivered-price",adminGiveawayController.getDeliveredPrizes)

router.get("/audit",adminGiveawayController.getGiveawayAuditReport)

// GET  /admin/giveaway/audit


/**
 * 📅 BULK CREATE GIVEAWAY CAMPAIGNS
 * Create multiple daily campaigns using date range
 */
router.post(
  "/campaigns/bulk",
  // validate("adminBulkCreateCampaign"),
  adminGiveawayController.bulkCreateCampaignByRanges
);


/**
 * 🚫 DISABLE A CAMPAIGN (Permanent / Manual)
 * Use case: Admin wants to completely disable a campaign
 */
router.patch(
  "/campaigns/:id/disable",
  adminGiveawayController.disableCampaign
);

/**
 * ⏸️ PAUSE A CAMPAIGN (Temporary)
 * Use case: Pause for a specific reason/day
 */
router.patch(
  "/campaigns/:campaignId/pause",
  adminGiveawayController.pauseCampaign
);




/**
 * ⚠️ TEMPORARY – CRON TEST ROUTE
 * REMOVE AFTER TESTING
 */
const runGiveawayWorker = require("../../../jobs/giveaway/giveaway.worker");

router.post(
  "/run-cron",
  async (req, res) => {
    await runGiveawayWorker();
    return res.json({
      success: true,
      message: "Giveaway cron executed manually"
    });
  }
);


module.exports = router;


// PATCH /admin/giveaway/:id/disable -- campaign.isActive = false;

// PATCH /admin/giveaway/:campaignId/pause -- campaign.isActive = false;


// POST /admin/giveaway/campaigns/bulk

// GET  /admin/giveaway/config
// PATCH /admin/giveaway/config


// PATCH /admin/giveaway/settings for yealy limit