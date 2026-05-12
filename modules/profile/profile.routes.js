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
  apiLimiter("profile_update", 40, 3600), // Max 30 profile updates per hour
  // validation.validateProfileUpdate,
  controller.updateProfile,
);

router.patch(
  "/discovery-preference/reset",
  auth,
  apiLimiter("discovery_reset", 10, 60),
  controller.resetDiscoveryFilters,
);

router.patch(
  "/discovery-preference",
  auth,
  apiLimiter("discovery_update", 10, 60),
  validateDiscoveryFilters,
  controller.updateDiscoveryFilters,
);

router.patch("/", apiLimiter("update_preference", 20, 60), controllerDis.updatePreference);
router.post("/photos", apiLimiter("photo_upload", 10, 3600), uploadMiddleware.uploadPhotos, controller.uploadPhotos);

// router.post(
//   "/photos",
//   (req, res, next) => {
//     uploadMiddleware.uploadPhotos(req, res, (err) => {
//       if (err) {
//         return uploadMiddleware.handleMulterError(err, req, res, next);
//       }
//       next();
//     });
//   },
//   controller.uploadPhotos
// );

router.delete("/photos", apiLimiter("photo_delete", 10, 3600), controller.deletePhoto);
router.patch("/photos/reorder", apiLimiter("photo_reorder", 10, 3600), controller.reorderPhotos);

router.post(
  "/selfie",
  apiLimiter("selfie_upload", 5, 3600),
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
  apiLimiter("id_upload", 3, 3600),
  uploadMiddleware.uploadFields,
  // validation.validateIDUpload,
  controller.uploadIDDocument,
);

router.get("/verification-status", apiLimiter("verification_status", 20, 60), controller.getVerificationStatus);

router.post(
  "/location",
  apiLimiter("location_update", 20, 60),
  validation.validateLocation,
  controller.updateLocation,
);

router.get("/status", apiLimiter("profile_status", 30, 60), controller.getStatus);

router.get("/me", apiLimiter("profile_me", 30, 60), controller.getMyProfile);

router.post("/bulk-add", masterController.bulkAddMasterData);

router.get("/config", apiLimiter("app_config", 20, 60), masterController.getAppConfig);

router.get(
  "/:userId",
  apiLimiter("profile_view", 60, 60), // Max 60 profile views per minute (Prevents Scraping)
  validation.validateUserIdParam,
  controller.getUserProfile,
);

router.patch("/visibility", auth, apiLimiter("visibility_update", 10, 60), controller.updateVisibility);

router.get("/blocked/all", apiLimiter("block_list", 20, 60), userAction.getBlockList);

router.post("/block/:id", apiLimiter("block_user", 10, 3600), userAction.blockUser);
router.delete("/unblock/:id", apiLimiter("unblock_user", 10, 3600), userAction.unblockUser);
router.get("/block-list", apiLimiter("block_list", 20, 60), userAction.getBlockList);

// Report
router.post("/report/:id", apiLimiter("report_user", 5, 3600), userAction.reportUser);

router.post("/resetData", controller.resetTestData);
module.exports = router;