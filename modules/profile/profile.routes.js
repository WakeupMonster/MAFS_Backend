const express = require("express");
const router = express.Router();
const controller = require("./profile.controller");
const auth = require("../auth/auth.middleware");
const uploadMiddleware = require("../upload/upload.middleware");
const validation = require("./profile.validation");
const controllerDis = require("../discovery/discovery.controller");
const userAction = require("./userActionController");
// const ENUMS = require("../../config/enums");
const masterController = require("./master.controller");
const { apiLimiter } = require("../../common/middlewares/apiLimiter");

const { validateDiscoveryFilters } = require("../../common/utils/validators");

router.use(auth);

// router.get("/upload-signature", controller.getUploadSignature);

router.patch(
  "/update",
  apiLimiter("profile_update", 40, 300), // 40 req / 5 mins
  // validation.validateProfileUpdate,
  controller.updateProfile,
);

router.patch(
  "/discovery-preference/reset",
  auth,
  // apiLimiter("discovery_reset", 10, 60),
  controller.resetDiscoveryFilters,
);

router.patch(
  "/discovery-preference",
  auth,
  // apiLimiter("discovery_update", 10, 60),
  validateDiscoveryFilters,
  controller.updateDiscoveryFilters,
);

// router.patch("/", apiLimiter("update_preference", 20, 60), controllerDis.updatePreference);
// router.post("/photos", apiLimiter("photo_upload", 10, 3600), uploadMiddleware.uploadPhotos, controller.uploadPhotos);
router.patch("/", controllerDis.updatePreference);
router.post("/photos", apiLimiter("photo_upload", 20, 300), uploadMiddleware.uploadPhotos, controller.uploadPhotos);

router.delete("/photos", apiLimiter("photo_delete", 20, 300), controller.deletePhoto);
router.patch("/photos/reorder", apiLimiter("photo_reorder", 20, 300), controller.reorderPhotos);

router.post(
  "/selfie",
  apiLimiter("selfie_upload", 5, 60), // 5 req / 1 min
  (req, res, next) => {
    uploadMiddleware.uploadSingle("selfie")(req, res, (err) => {
      if (err) {
        return uploadMiddleware.handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  controller.uploadSelfie,
);

router.post(
  "/id-document",
  apiLimiter("id_upload", 5, 60), // 5 req / 1 min
  uploadMiddleware.uploadFields,
  // validation.validateIDUpload,
  controller.uploadIDDocument,
);

router.get("/verification-status",
  //  apiLimiter("verification_status", 20, 60), 
  controller.getVerificationStatus);

router.post(
  "/location",
  // apiLimiter("location_update", 20, 60),
  validation.validateLocation,
  controller.updateLocation,
);

router.get("/status", apiLimiter("profile_status", 30, 60), controller.getStatus);

router.get("/me", apiLimiter("profile_me", 30, 60), controller.getMyProfile);

router.post("/bulk-add", masterController.bulkAddMasterData);

router.get("/config", apiLimiter("app_config", 30, 300), masterController.getAppConfig);

router.get(
  "/:userId",
  // apiLimiter("profile_view", 60, 60), // Max 60 profile views per minute (Prevents Scraping)
  validation.validateUserIdParam,
  controller.getUserProfile,
);

router.patch("/visibility", auth,
  apiLimiter("visibility_update", 10, 300),
  controller.updateVisibility);


router.get("/blocked/all", userAction.getBlockList);

router.post("/block/:id", apiLimiter("block_user", 10, 300), userAction.blockUser);
router.delete("/unblock/:id", apiLimiter("unblock_user", 10, 300), userAction.unblockUser);
router.get("/block-list", userAction.getBlockList);

// Report
router.post("/report/:id",
  apiLimiter("report_user", 5, 600), // 5 req / 10 mins
  userAction.reportUser);

router.post("/resetData", controller.resetTestData);
module.exports = router;