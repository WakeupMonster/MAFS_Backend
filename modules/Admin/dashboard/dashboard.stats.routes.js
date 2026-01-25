const express = require("express");
const router = express.Router();
const ctrl = require("./dashboard.stats.controller");

/*=========== Dashboard / Analytics ==========*/
router.get("/stats/kpi", ctrl.getKpiOverview);

module.exports = router;
