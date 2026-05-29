const express = require("express");
const router = express.Router();
const fakeProfileController = require("./fakeProfile.controller");
const auth = require("../../auth/auth.middleware");
const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");

// All routes are protected and admin-only
router.use(auth, allowAdmin);

// City management routes
router.post("/cities", fakeProfileController.addCity);
router.get("/cities", fakeProfileController.listCities);
router.delete("/cities/:id", fakeProfileController.deleteCity);

// Profile routes
router.post("/bulk-create", fakeProfileController.bulkCreate);
router.get("/", fakeProfileController.listAll);
router.patch("/:id/toggle", fakeProfileController.toggleStatus);
router.delete("/:id", fakeProfileController.deleteSingle);

module.exports = router;