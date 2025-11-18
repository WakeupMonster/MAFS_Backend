const express = require("express");
const router = express.Router();

router.use("/auth", require("../../modules/auth/auth.routes"));
router.use("/health", require("../public/health.routes"));
router.use("/docs", require("../public/docs.routes"));

module.exports = router;


