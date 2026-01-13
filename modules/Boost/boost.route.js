const express = require("express");
const router = express.Router();
const auth = require("../../modules/auth/auth.middleware");
const controller = require("./boost.controller");

router.post("/activate", auth, controller.activateBoost);
router.post("/unactivate", auth, controller.unboostUser);


module.exports = router;