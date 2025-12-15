// const express = require("express");
// const router = express.Router();
// const controller = require("./profile.controller");
// const validation = require("./profile.validation");
// const auth = require("../../modules/auth/auth.middleware");
// const uploadMiddleware = require("../upload/upload.middleware");

// router.use(auth);  // protect all routes

// router.post("/basic", controller.updateBasicInfo);
// router.post("/location", validation.location, controller.updateLocation);
// router.post("/interests", controller.updateInterests);//Replace All
// router.post("/interests/add", controller.addInterests);  //Append New
// router.post("/relationship-goal", validation.relationshipGoal, controller.updaterelationshipGoal);
// router.post("/preferences", validation.preferences, controller.updatePreferences);
// router.post("/preferences/gender/add", validation.preferences, controller.addPreferences);
// router.post(
//   '/photos',
//   (req, res, next) => {
//     uploadMiddleware.uploadPhotos(req, res, (err) => {
//       if (err) {
//         return uploadMiddleware.handleMulterError(err, req, res, next);
//       }
//       next();
//     });
//   },
//   controller.uploadPhoto
// );
// router.post("/complete", controller.markProfileCompleted);

// router.get("/me", controller.getMyProfile);
// router.get("/status", controller.getStatus);
// router.get("/:userId", controller.getPublicProfile);

// router.delete("/photos", controller.deletePhoto);
// router.delete("/interests", controller.deleteAllInterests);
// router.delete("/interests/:interest", controller.deleteOneInterest);

// // router.delete("/", controller.deleteProfile);

// module.exports = router;

const express = require("express");
const router = express.Router();
const controller = require("./profile.controller");
const auth = require("../auth/auth.middleware");
const uploadMiddleware = require("../upload/upload.middleware");
const validation = require("./profile.validation");
// const ENUMS = require("../../config/enums");
const {
  getAllEnums,
  getDetails,
  addOrUpdateInterest,
  addOrUpdateLanguage,
  addOrUpdateReligion,
} = require("./profile.enums.controller");

router.use(auth);

router.patch(
  "/update",
  validation.validateProfileUpdate,
  controller.updateProfile
);

router.patch(
  "/discovery-preference",
  auth,
  controller.updateDiscoveryPreference
);

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
  validation.validateIDUpload,
  controller.uploadIDDocument
);

router.post(
  "/location",
  validation.validateLocation,
  controller.updateLocation
);

router.get("/status", controller.getStatus);

router.get("/me", controller.getMyProfile);

router.get("/getdetails", getDetails); // fixed route
router.post("/addOrUpdateInterest", addOrUpdateInterest);
router.post("/addOrUpdateLanguage", addOrUpdateLanguage);
router.post("/addOrUpdateReligion", addOrUpdateReligion);

router.get("/:userId", controller.getPublicProfile);

router.patch(
  "/visibility",
  auth,  // Ensure user is authenticated
  controller.updateVisibility
);

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

router.get("/enums/all", getAllEnums);

router.get("/enums/all", (req, res) => {
  res.json({
    success: true,
    data: validation.ENUMS,
  });
});

// Get APIs for fetch this field data genderPreference, relationshipGoal, distance, interest, age(min,max)
// router.get("/getdetails", getDetails);

module.exports = router;
