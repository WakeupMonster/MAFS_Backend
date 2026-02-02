const express = require("express");
const router = express.Router();
const cmsController = require("./content.admin.controller");

/** @section FAQ Management */
router.post("/faq", cmsController.createFAQ); // Create
router.patch("/faq/:id", cmsController.updateFAQ); // Update
router.delete("/faq/:id", cmsController.deleteFAQ); // Delete

/** @section Privacy Policy */
router.post("/privacy-policy", cmsController.updatePrivacyPolicy); // ADD & Update Privacy Policy

// router.post("/add-privacy-policy", cmsController.addPrivacySection);
// router.patch("/update-privacy-policy", cmsController.updatePrivacySection);
// router.delete("/delete-privacy-policy", cmsController.deletePrivacySection);

/** @section Terms & Conditions*/
router.post("/terms-conditions", cmsController.updatePrivacyPolicy); // ADD & Update terms conditions
 
module.exports = router;        