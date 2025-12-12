const express = require("express");
const router = express.Router();
const { uploadFWB, handleMulterError } = require("../upload/upload.middleware");
const auth = require("../auth/auth.middleware");
const {
  createFWB,
  updateFWB,
  getAllFWB,
  getSingleFWB,
  deleteFWB,
  deleteFWBImage,
} = require("../fwb/fwb.controllers");

router.use(auth);

// CREATE
router.post("/add", uploadFWB, handleMulterError, createFWB);

// UPDATE
router.patch("/update", uploadFWB, handleMulterError, updateFWB);

// GET ALL
router.get("/get-all-fwb", getAllFWB);

// GET SINGLE
router.get("/get-single", getSingleFWB);

// DELETE
router.delete("/delete", deleteFWB);

router.delete("/delete/img", deleteFWBImage);

module.exports = router;
