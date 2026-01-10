const express = require("express");
const router = express.Router();
const auth = require("../auth/auth.middleware");
const {getKpiOverview} = require("./admintestcontroller")

router.use(auth);

router.get("/getkpi",getKpiOverview)

module.exports = router;
