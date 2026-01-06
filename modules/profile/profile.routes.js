const express = require("express");
const router = express.Router();
const controller = require("./profile.controller");
const auth = require("../auth/auth.middleware");
const uploadMiddleware = require("../upload/upload.middleware");
const validation = require("./profile.validation");
const controllerDis = require("../discovery/discovery.controller");
const userAction = require("./userActionController")
// const ENUMS = require("../../config/enums");

const  masterController  = require("./master.controller")

router.use(auth);

router.patch(
  "/update",
  // validation.validateProfileUpdate,
  controller.updateProfile
);

router.patch(
  "/discovery-preference",
  auth,
  controller.updateDiscoveryFilters
);
router.get("/discovery-preference", auth, controller.getDiscoveryPreference);

router.patch("/", controllerDis.updatePreference);

router.post(
  "/photos",
  (req, res, next) => {
    uploadMiddleware.uploadPhotos(req, res, (err) => {
      if (err) {
        return uploadMiddleware.handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  controller.uploadPhotos
);


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

router.post(
  "/location",
  validation.validateLocation,
  controller.updateLocation
);

router.get("/status", controller.getStatus);

router.get("/me", controller.getMyProfile);


// 1. POST API - Database mein data bharne ke liye (Admin use karega)
router.post("/bulk-add", masterController.bulkAddMasterData);

// 2. GET API - Frontend ko manager wala format dene ke liye
router.get("/config", masterController.getAppConfig);


router.get("/:userId", controller.getUserProfile);

router.patch(
  "/visibility",
  auth,  // Ensure user is authenticated
  controller.updateVisibility
);

router.get("/blocked/all", userAction.getBlockList);

router.patch('/quick-verify/:userId', controller.quickVerifyUser);

// Block/Unblock
router.post("/block/:id",  userAction.blockUser);
router.delete("/unblock/:id",  userAction.unblockUser);
router.get("/block-list",  userAction.getBlockList);

// Report
router.post("/report/:id", userAction.reportUser);
module.exports = router;

// Get APIs for fetch this field data genderPreference, relationshipGoal, distance, interest, age(min,max)
// router.get("/getdetails", getDetails);
// router.get("/enums/all", (req, res) => {
//   const data = {
//     gender: ENUMS.gender.map(e => `${e.label}${e.emoji}`),
//     genderPreference: ENUMS.genderPreference.map(e => `${e.label}${e.emoji}`),
//     religion: ENUMS.religion.map(e => `${e.label}${e.emoji}`),
//     relationshipGoals: ENUMS.relationshipGoals.map(e => `${e.label}${e.emoji}`),
//     interests: ENUMS.interests.map(e => `${e.label}${e.emoji}`)
//   };

//   res.json({ success: true, data });
// });

