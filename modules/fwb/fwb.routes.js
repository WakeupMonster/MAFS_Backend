const express = require("express");
const router = express.Router();

const {
  createFWB,
  updateFWB,
  getAllFWB,
  getSingleFWB,
  deleteFWB,
} = require("../fwb/fwb.controllers");

// CREATE
router.post("/add", createFWB);

// UPDATE
router.patch("/update", updateFWB);

// GET ALL
router.get("/get-all-fwb", getAllFWB);

// GET SINGLE
router.get("/get-single", getSingleFWB);

// DELETE
router.delete("/delete", deleteFWB);

module.exports = router;
