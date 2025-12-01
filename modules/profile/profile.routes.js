const express = require("express");
const router = express.Router();
const controller = require("./profile.controller");
const validation = require("./profile.validation");
const auth = require("../../modules/auth/auth.middleware");
const uploadMiddleware = require("../upload/upload.middleware");

router.use(auth);  // protect all routes

router.post("/basic", controller.updateBasicInfo);
router.post("/location", validation.location, controller.updateLocation);
router.post("/interests", controller.updateInterests);//Replace All
router.post("/interests/add", controller.addInterests);  //Append New
router.post("/relationship-goal", validation.relationshipGoal, controller.updaterelationshipGoal);
router.post("/preferences", validation.preferences, controller.updatePreferences);
router.post("/preferences/gender/add", validation.preferences, controller.addPreferences);
router.post(
  '/photos',
  (req, res, next) => {
    uploadMiddleware.uploadPhotos(req, res, (err) => {
      if (err) {
        return uploadMiddleware.handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  controller.uploadPhoto
);
router.post("/complete", controller.markProfileCompleted);

router.get("/me", controller.getMyProfile);
router.get("/status", controller.getStatus); 
router.get("/:userId", controller.getPublicProfile);

router.delete("/photos", controller.deletePhoto);
router.delete("/interests", controller.deleteAllInterests);
router.delete("/interests/:interest", controller.deleteOneInterest); 

// router.delete("/", controller.deleteProfile);

module.exports = router;