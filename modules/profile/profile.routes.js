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
const { validateDiscoveryFilters } = require("../../common/utils/validators");

router.use(auth);

// router.get("/upload-signature", controller.getUploadSignature);

router.patch(
  "/update",
  // validation.validateProfileUpdate,
  controller.updateProfile
);

router.patch(
  "/discovery-preference/reset",
  auth,
  controller.resetDiscoveryFilters
);

router.patch(
  "/discovery-preference",
  auth,
  validateDiscoveryFilters,
  controller.updateDiscoveryFilters
);

router.patch("/", controllerDis.updatePreference);
router.post("/photos", uploadMiddleware.uploadPhotos, controller.uploadPhotos);

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

router.delete("/photos", controller.deletePhoto);
router.patch("/photos/reorder", controller.reorderPhotos);

router.post(
  "/selfie",
  (req, res, next) => {
    uploadMiddleware.uploadSingle("selfie")(req, res, (err) => {
      if (err) {
        return uploadMiddleware.handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  controller.uploadSelfie
);

router.post(
  "/id-document",
  uploadMiddleware.uploadFields,
  // validation.validateIDUpload,
  controller.uploadIDDocument
);

router.get("/verification-status", controller.getVerificationStatus);

router.post(
  "/location",
  // validation.validateLocation,
  controller.updateLocation
);

router.get("/status", controller.getStatus);

router.get("/me", controller.getMyProfile);

router.post("/bulk-add", masterController.bulkAddMasterData);

router.get("/config", masterController.getAppConfig);

router.get(
  "/:userId",
  validation.validateUserIdParam,
  controller.getUserProfile
);

router.patch("/visibility", auth, controller.updateVisibility);

router.get("/blocked/all", userAction.getBlockList);

router.post("/block/:id", userAction.blockUser);
router.delete("/unblock/:id", userAction.unblockUser);
router.get("/block-list", userAction.getBlockList);

// Report
router.post("/report/:id", userAction.reportUser);

router.post("/resetData", controller.resetTestData);
module.exports = router;
