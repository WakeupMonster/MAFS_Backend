const express = require("express");
const router = express.Router();
// const ctrl = require("./dashboard.stats.controller");
const {getKpiOverview} = require("../../admintester/admintestcontroller")

/*=========== Dashboard / Analytics ==========*/
router.get("/stats/kpi", getKpiOverview);

module.exports = router;