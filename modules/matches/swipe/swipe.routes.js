const express = require("express");
const router = express.Router();
const controller = require("./swipe.controller");
const validation = require("./swipe.validation");
const auth = require("../../auth/auth.middleware");

router.use(auth);

router.get("/feed", validation.feed, controller.getFeed);
router.post("/action", validation.action, controller.action);
router.post("/undo", validation.undo, controller.undo);
router.get("/matches", controller.getMatches);

module.exports = router;