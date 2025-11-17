const express = require("express");
const router = express.Router();

// health check updated

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date()
  });
});
module.exports = router;