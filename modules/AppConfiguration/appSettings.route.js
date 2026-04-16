const router = require("express").Router();
const ctrl = require("./appSettings.controller");
const adsCtrl = require("./adsConfig.controller"); // New Ads Config Controller

// Middlewares
const auth = require("../../modules/auth/auth.middleware");
const {
  allowAdmin,
} = require("../../common/middlewares/allowAdmin.middleware");
const uploadMiddleware = require("../upload/upload.middleware");

// Public API (no auth needed)
router.get("/social-links", ctrl.getSocialLinks);

// Get General Settings
router.get("/general", ctrl.getGeneralSettings);

// Get Ads Settings - Protected with Auth so only valid users can fetch Ads
router.get("/ads", auth, adsCtrl.getAdsSettings);

/*
 * ============= ATUHORIZED OR ENSURE ROLE IS ADMIN or not =============
 */
// --- Protected Admin Routes ---
router.use(auth);
router.use(allowAdmin);

// Admin API (auth needed)
router.post("/social-links", ctrl.upsertSocialLinks);

// Route for General Settings (Logo ke saath)''
router.post(
  "/general",
  uploadMiddleware.uploadSingle("logo"),
  ctrl.upsertGeneralSettings,
);

// Ads Settings Routes
router.post("/ads", adsCtrl.upsertAdsSettings);

module.exports = router;