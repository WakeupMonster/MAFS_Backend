const express = require("express");
const router = express.Router();
const auth = require("../auth/auth.middleware");
const { allowCounselor } = require("../../middlewares/allowCounselor.middleware");

router.use(auth);
router.use(allowCounselor);

// Example
router.get("/sessions", (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

module.exports = router;
