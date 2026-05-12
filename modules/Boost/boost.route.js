const express = require("express");
const router = express.Router();
const auth = require("../../modules/auth/auth.middleware");
const controller = require("./boost.controller");
const { apiLimiter } = require("../../common/middlewares/apiLimiter");

router.post("/activate", auth, apiLimiter("boost_activate", 3, 3600), controller.activateBoost);
router.post("/deactivate", auth, apiLimiter("boost_deactivate", 3, 3600), controller.unboostUser);

module.exports = router;