const express = require("express");
const router = express.Router();

const { swaggerUi, swaggerSpec } = require("../../config/swagger");

router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(swaggerSpec));

module.exports = router;