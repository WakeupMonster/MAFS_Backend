const express = require("express");
const router = express.Router();
const controller = require("./profile.controller");
const validation = require("./profile.validation");
const auth = require("../../modules/auth/auth.middleware");

router.use(auth);  // protect all routes

router.post("/basic", controller.updateBasicInfo);
router.post("/location", validation.location, controller.updateLocation);
router.post("/interests", validation.interests, controller.updateInterests);
router.post("/preferences", validation.preferences, controller.updatePreferences);
router.post("/photos", validation.photoUpload, controller.uploadPhoto);
router.post("/complete", controller.markProfileCompleted);

router.get("/me", controller.getMyProfile);
router.get("/:userId", controller.getPublicProfile);


// router.delete("/photos/:photoId", controller.deletePhoto);
// router.delete("/interests", controller.deleteAllInterests);
// router.delete("/interests/:interest", controller.deleteOneInterest);
// router.delete("/", controller.deleteProfile);


module.exports = router;