const express = require("express");
const router = express.Router();
const cmsController = require("./content.admin.controller");
const auth = require("../../auth/auth.middleware");
const allowAdminMiddleware = require("../../../common/middlewares/allowAdmin.middleware");

router.use(auth);
router.use(allowAdminMiddleware);

router.post("/add-faq", cmsController.createFAQ);
router.patch("/update-faq/:id", cmsController.updateFAQ);
router.delete("/delete-faq/:id", cmsController.deleteFAQ);

router.post("/privacy-policy", cmsController.updatePrivacyPolicy);

router.post("/add-privacy-policy", cmsController.addPrivacySection);
router.patch("/update-privacy-policy", cmsController.updatePrivacySection);
router.delete("/delete-privacy-policy", cmsController.deletePrivacySection);

router.post("/add-terms-conditions", cmsController.addTermCondtion);
router.patch("/update-terms-conditions", cmsController.updateTermCondtion);
router.delete("/delete-terms-conditions", cmsController.deleteTermCondtion);

module.exports = router;
